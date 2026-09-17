export function createBasicAuthMiddleware({
  username = "friends",
  passwordBinding = "BASIC_AUTH_PASSWORD",
  realm = "preview",
} = {}) {
  return async function onRequest(context) {
    const expectedPassword = context.env?.[passwordBinding];
    if (typeof expectedPassword !== "string" || expectedPassword === "") {
      return new Response("Authentication is not configured", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const credentials = readBasicCredentials(
      context.request.headers.get("Authorization"),
    );
    if (
      !credentials ||
      credentials.username !== username ||
      !(await secureEqual(credentials.password, expectedPassword))
    ) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": `Basic realm="${escapeRealm(realm)}", charset="UTF-8"`,
        },
      });
    }
    return context.next();
  };
}

export function createGitHubMetadataHandler({
  repository,
  userAgent = "cachix-site-kit",
  ttl = 3600,
  includeRelease = true,
  fetch: fetchOverride,
} = {}) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository ?? "")) {
    throw new TypeError("repository must use the owner/name format");
  }
  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new TypeError("ttl must be a positive integer");
  }

  return async function onRequestGet({ env = {} } = {}) {
    const fetcher = fetchOverride ?? globalThis.fetch;
    const headers = new Headers({ "User-Agent": userAgent });
    if (env.GITHUB_TOKEN) headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`);
    const options = {
      headers,
      cf: { cacheTtl: ttl, cacheEverything: true },
    };
    let stars = null;
    let release = null;
    let releaseUrl = null;

    try {
      const requests = [fetcher(`https://api.github.com/repos/${repository}`, options)];
      if (includeRelease) {
        requests.push(fetcher(`https://api.github.com/repos/${repository}/releases/latest`, options));
      }
      const [repoResult, releaseResult] = await Promise.allSettled(requests);
      const repoData = await responseData(repoResult);
      const releaseData = await responseData(releaseResult);
      if (typeof repoData?.stargazers_count === "number") stars = repoData.stargazers_count;
      if (typeof releaseData?.tag_name === "string") release = releaseData.tag_name;
      if (typeof releaseData?.html_url === "string") releaseUrl = releaseData.html_url;
    } catch {}

    const successful = stars !== null || release !== null;
    return Response.json(
      includeRelease ? { stars, release, releaseUrl } : { stars },
      {
        headers: {
          "Cache-Control": successful ? `public, max-age=${ttl}` : "no-store",
        },
      },
    );
  };
}

async function responseData(result) {
  if (result?.status !== "fulfilled" || !result.value.ok) return undefined;
  try {
    return await result.value.json();
  } catch {
    return undefined;
  }
}

export function formatGitHubCount(value) {
  if (!Number.isFinite(value) || value < 0) return undefined;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function readBasicCredentials(header) {
  const match = header?.match(/^Basic\s+(.+)$/i);
  if (!match) return undefined;
  try {
    const decoded = atob(match[1]);
    const separator = decoded.indexOf(":");
    if (separator < 0) return undefined;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return undefined;
  }
}

async function secureEqual(actual, expected) {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function escapeRealm(value) {
  return String(value).replace(/["\\]/g, "");
}

export function createMarkdownMiddleware({ fileName = "index.md", redirect = false } = {}) {
  if (typeof fileName !== "string" || fileName === "" || fileName.includes("/")) {
    throw new TypeError("fileName must be a file name without path separators");
  }
  return async function onRequest(context) {
    const { request } = context;
    if (request.method !== "GET" && request.method !== "HEAD") return context.next();
    if (!prefersMarkdown(request.headers.get("Accept"))) return context.next();
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/")) return context.next();
    const markdownPath = `${url.pathname}${fileName}`;

    if (redirect) {
      return new Response(null, {
        status: 302,
        headers: { Location: markdownPath, Vary: "Accept" },
      });
    }

    const assets = context.env?.ASSETS;
    if (typeof assets?.fetch !== "function") return context.next();
    const asset = await assets.fetch(
      new Request(new URL(markdownPath, url), { method: request.method, headers: request.headers }),
    );
    if (asset.status !== 200 && asset.status !== 304) return context.next();

    const headers = new Headers(asset.headers);
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("Content-Location", markdownPath);
    headers.append("Vary", "Accept");
    return new Response(asset.status === 304 ? null : asset.body, {
      status: asset.status,
      headers,
    });
  };
}

export function prefersMarkdown(accept) {
  if (typeof accept !== "string") return false;
  let markdown = 0;
  let html = 0;
  for (const part of accept.split(",")) {
    const [type, ...parameters] = part.split(";");
    const media = type.trim().toLowerCase();
    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith("q="));
    const weight = quality ? Number.parseFloat(quality.slice(2)) : 1;
    if (!Number.isFinite(weight)) continue;
    if (media === "text/markdown") markdown = Math.max(markdown, weight);
    else if (media === "text/html") html = Math.max(html, weight);
  }
  return markdown > 0 && markdown >= html;
}
