import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export async function checkInternalLinks({ outputDir, site = "https://site.invalid" }) {
  if (!outputDir) throw new TypeError("outputDir is required");
  const htmlFiles = (await filesBelow(outputDir)).filter((path) => path.endsWith(".html"));
  const htmlByFile = new Map();
  for (const path of htmlFiles) {
    htmlByFile.set(relativePath(outputDir, path), await readFile(path, "utf8"));
  }

  const failures = [];
  for (const [file, html] of htmlByFile) {
    const route = routeForFile(file);
    const baseUrl = new URL(route, site);
    for (const match of html.matchAll(/\bhref=(['"])(.*?)\1/gi)) {
      const href = match[2].replaceAll("&amp;", "&");
      if (/^(?:mailto|tel|data|javascript):/i.test(href)) continue;

      let targetUrl;
      try {
        targetUrl = new URL(href, baseUrl);
      } catch {
        failures.push(`${file}: invalid URL ${href}`);
        continue;
      }
      if (targetUrl.origin !== baseUrl.origin) continue;

      const candidates = outputCandidates(targetUrl.pathname);
      const targetFile = await firstExisting(outputDir, candidates);
      if (!targetFile) {
        failures.push(`${file}: ${href} resolves to missing ${targetUrl.pathname}`);
        continue;
      }

      if (targetUrl.hash && targetFile.endsWith(".html")) {
        const targetHtml = htmlByFile.get(targetFile) ?? await readFile(join(outputDir, targetFile), "utf8");
        const fragment = decodeURIComponent(targetUrl.hash.slice(1));
        if (!targetHtml.includes(`id="${fragment}"`) && !targetHtml.includes(`id='${fragment}'`)) {
          failures.push(`${file}: ${href} points to a missing fragment`);
        }
      }
    }
  }

  return { filesChecked: htmlFiles.length, failures: failures.sort() };
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

async function firstExisting(root, candidates) {
  for (const candidate of candidates) {
    try {
      if ((await stat(join(root, candidate))).isFile()) return candidate;
    } catch {}
  }
  return undefined;
}
