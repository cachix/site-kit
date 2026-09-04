#!/usr/bin/env node

import { resolve } from "node:path";
import { checkLinks } from "./index.js";

const outputDir = resolve(process.argv[2] ?? "dist");
const site = process.argv[3];

try {
  process.exitCode = await checkLinks({ outputDir, site });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
