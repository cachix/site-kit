import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("./fixtures/starlight/dist/", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const components = await readFile(new URL("components/index.html", root), "utf8");
const assetDirectory = new URL("_astro/", root);
const cssFiles = (await readdir(assetDirectory)).filter((file) => file.endsWith(".css"));
const css = (
  await Promise.all(cssFiles.map((file) => readFile(join(assetDirectory.pathname, file), "utf8")))
).join("\n");

assert.match(html, /class="ec-line terminal-command-start"/);
assert.match(html, /data-code="cachix-site-check-links dist"/);
assert.doesNotMatch(html, /class="hero(?:\s|")/);
assert.match(html, /<h1 id="_top" class="sr-only" data-page-title>Site Kit<\/h1>/);
assert.match(components, /class="csk-button(?:\s|")/);
assert.match(components, /class="csk-flow(?:\s|")/);
assert.match(components, /class="csk-flow-pair(?:\s|")/);
assert.match(components, /data-arrival="true"/);
assert.match(components, /class="csk-flow__edge csk-flow__edge--upper"/);
assert.match(components, /class="csk-latest-post(?:\s|")/);
assert.match(components, /class="csk-terminal(?:\s|")/);
assert.match(css, /csk-flow__track/);
assert.match(css, /csk-flow-arrival-spread/);
assert.doesNotMatch(css, /:where\(\)\s*\{/);

console.log("Verified shared Hero, terminal copy, and UI styles in Astro output.");
