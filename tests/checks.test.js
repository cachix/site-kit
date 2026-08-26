import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkInternalLinks } from "../src/checks/index.js";

test("checks internal pages, assets, and fragments", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-kit-links-"));
  await mkdir(join(root, "guide"));
  await writeFile(
    join(root, "index.html"),
    '<a href="/guide/#usage">Guide</a><a href="/missing/">Missing</a>',
  );
  await writeFile(
    join(root, "guide", "index.html"),
    '<h2 id="usage">Usage</h2><a href="#absent">Absent</a>',
  );

  const result = await checkInternalLinks({ outputDir: root, site: "https://site.invalid" });
  assert.equal(result.filesChecked, 2);
  assert.deepEqual(result.failures, [
    "guide/index.html: #absent points to a missing fragment",
    "index.html: /missing/ resolves to missing /missing/",
  ]);
});
