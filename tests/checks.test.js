import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkInternalLinks } from "../src/checks/index.js";

test("checks internal pages, assets, and fragments", async () => {
  const root = await mkdtemp(join(tmpdir(), "site-kit-links-"));
  await mkdir(join(root, "guide"));
  await mkdir(join(root, "assets"));
  await writeFile(
    join(root, "index.html"),
    '<a href="/guide/#us&#x61;ge">Guide</a><a href="/missing/">Missing</a><img src="/assets/logo.svg"><script src="/assets/missing.js"></script>',
  );
  await writeFile(
    join(root, "guide", "index.html"),
    "<h2 id='usage'>Usage</h2><a href='#absent'>Absent</a>",
  );
  await writeFile(join(root, "assets", "logo.svg"), "<svg></svg>");

  const result = await checkInternalLinks({ outputDir: root, site: "https://site.invalid" });
  assert.deepEqual(result, {
    filesChecked: 2,
    linksChecked: 2,
    fragmentsChecked: 1,
    assetsChecked: 1,
    failures: [
      "guide/index.html: #absent points to a missing fragment",
      "index.html: /assets/missing.js resolves to missing /assets/missing.js",
      "index.html: /missing/ resolves to missing /missing/",
    ],
  });
});
