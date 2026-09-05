import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import { checkLinks, createLycheeArguments } from "../src/checks/index.js";

test("builds a Lychee command for the generated site", () => {
  const outputDir = resolve("fixtures", "site output");
  assert.deepEqual(
    createLycheeArguments({ outputDir, site: "https://docs.example.test/guide/" }),
    [
      "--offline",
      "--root-dir",
      outputDir,
      "--remap",
      `^https://docs\\.example\\.test/guide ${pathToFileURL(outputDir).href}`,
      "--fallback-extensions",
      "html",
      "--index-files",
      "index.html",
      "--include-fragments",
      "--exclude-loopback",
      "--no-progress",
      join(outputDir, "**", "*.html"),
    ],
  );
});

test("rejects invalid site URLs", () => {
  assert.throws(
    () => createLycheeArguments({ outputDir: "dist", site: "file:///tmp/site" }),
    TypeError,
  );
  assert.throws(
    () => createLycheeArguments({ outputDir: "dist", site: "https://example.test/?draft=1" }),
    TypeError,
  );
});

test("returns Lychee's exit status", async () => {
  const invocations = [];
  const exit = checkLinks({
    outputDir: "dist",
    site: "https://example.test",
    command: "test-lychee",
    spawn(command, args, options) {
      invocations.push({ command, args, options });
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("exit", 2));
      return child;
    },
  });

  assert.equal(await exit, 2);
  assert.deepEqual(invocations.map(({ command }) => command), ["test-lychee"]);
  assert.deepEqual(invocations.map(({ options }) => options), [{ stdio: "inherit" }]);
  const args = createLycheeArguments({
    outputDir: "dist",
    site: "https://example.test",
  });
  assert.deepEqual(invocations.map(({ args: invocationArgs }) => invocationArgs), [args]);
});
