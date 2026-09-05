import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function createLycheeArguments({ outputDir, site }) {
  if (!outputDir) throw new TypeError();
  if (!site) throw new TypeError();

  const directory = resolve(outputDir);
  const siteUrl = new URL(site);
  if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
    throw new TypeError();
  }
  if (siteUrl.search || siteUrl.hash) {
    throw new TypeError();
  }

  const siteBase = siteUrl.href.replace(/\/$/, "");
  const outputUrl = pathToFileURL(directory).href.replace(/\/$/, "");
  const input = join(directory, "**", "*.html");
  const escapedSite = escapeRegularExpression(siteBase);
  return [
    "--offline",
    "--root-dir",
    directory,
    "--remap",
    `^${escapedSite} ${outputUrl}`,
    "--fallback-extensions",
    "html",
    "--index-files",
    "index.html",
    "--include-fragments",
    "--exclude-loopback",
    "--no-progress",
    input,
  ];
}

export async function checkLinks({
  outputDir,
  site,
  command = "lychee",
  spawn: spawnProcess = spawn,
}) {
  const args = createLycheeArguments({ outputDir, site });
  return runLychee(command, args, spawnProcess);
}

function runLychee(command, args, spawnProcess) {
  const child = spawnProcess(command, args, {
    stdio: "inherit",
  });
  return new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
