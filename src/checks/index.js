import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export async function checkInternalLinks({ outputDir, site = "https://site.invalid" }) {
  if (!outputDir) throw new TypeError("outputDir is required");
  const htmlFiles = (await filesBelow(outputDir)).filter((path) => path.endsWith(".html"));
  const htmlByFile = new Map();
  const idsByFile = new Map();
  for (const path of htmlFiles) {
    const file = relativePath(outputDir, path);
    const html = await readFile(path, "utf8");
    htmlByFile.set(file, html);
    idsByFile.set(
      file,
      new Set(
        [...html.matchAll(/\sid=(['"])(.*?)\1/gi)]
          .map((match) => decodeHtml(match[2])),
      ),
    );
  }

  const failures = [];
  let linksChecked = 0;
  let fragmentsChecked = 0;
  let assetsChecked = 0;
  for (const [file, html] of htmlByFile) {
    const route = routeForFile(file);
    const baseUrl = new URL(route, site);
    for (const match of html.matchAll(/\s(href|src)=(['"])(.*?)\2/gi)) {
      const attribute = match[1].toLowerCase();
      const value = decodeHtml(match[3].trim());
      if (!value) continue;

      let targetUrl;
      try {
        targetUrl = new URL(value, baseUrl);
      } catch {
        failures.push(`${file}: invalid ${attribute} ${value}`);
        continue;
      }
      if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") continue;
      if (targetUrl.origin !== baseUrl.origin) continue;

      let candidates;
      try {
        candidates = outputCandidates(targetUrl.pathname);
      } catch {
        failures.push(`${file}: malformed path in ${attribute} ${value}`);
        continue;
      }
      const targetFile = await firstExisting(outputDir, candidates);
      if (!targetFile) {
        failures.push(`${file}: ${value} resolves to missing ${targetUrl.pathname}`);
        continue;
      }

      if (attribute === "src") {
        assetsChecked += 1;
        continue;
      }

      linksChecked += 1;
      if (targetUrl.hash && targetFile.endsWith(".html")) {
        let fragment;
        try {
          fragment = decodeURIComponent(targetUrl.hash.slice(1));
        } catch {
          failures.push(`${file}: malformed fragment in ${value}`);
          continue;
        }
        if (!idsByFile.get(targetFile)?.has(fragment)) {
          failures.push(`${file}: ${value} points to a missing fragment`);
        } else {
          fragmentsChecked += 1;
        }
      }
    }
  }

  return {
    filesChecked: htmlFiles.length,
    linksChecked,
    fragmentsChecked,
    assetsChecked,
    failures: failures.sort(),
  };
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else files.push(path);
  }
  return files;
}

function relativePath(root, path) {
  return relative(root, path).split(sep).join("/");
}

function routeForFile(file) {
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`;
  return `/${file}`;
}

function outputCandidates(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (decoded === "") return ["index.html"];
  if (decoded === "404/") return ["404/index.html", "404.html"];
  if (decoded.endsWith("/")) return [`${decoded}index.html`];
  return [decoded, `${decoded}.html`, `${decoded}/index.html`];
}

function decodeHtml(value) {
  return value.replace(/&(?:amp|quot|apos|#x[0-9a-f]+|#\d+);/gi, (entity) => {
    const body = entity.slice(1, -1).toLowerCase();
    if (body === "amp") return "&";
    if (body === "quot") return '"';
    if (body === "apos") return "'";
    const radix = body.startsWith("#x") ? 16 : 10;
    const digits = body.slice(radix === 16 ? 2 : 1);
    const codePoint = Number.parseInt(digits, radix);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

async function firstExisting(root, candidates) {
  for (const candidate of candidates) {
    try {
      if ((await stat(join(root, candidate))).isFile()) return candidate;
    } catch {}
  }
  return undefined;
}
