#!/usr/bin/env node

import { resolve } from "node:path";
import { checkInternalLinks } from "./index.js";

const outputDir = resolve(process.argv[2] ?? "dist");
const site = process.argv[3] ?? "https://site.invalid";

try {
  const result = await checkInternalLinks({ outputDir, site });
  if (result.failures.length) {
    console.error(result.failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(
      `Checked ${result.linksChecked} internal links, ${result.fragmentsChecked} fragments, and ${result.assetsChecked} assets in ${result.filesChecked} HTML files.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
