import type { spawn } from "node:child_process";

export interface LinkCheckOptions {
  outputDir: string;
  site: string;
  command?: string;
  spawn?: typeof spawn;
}

export function createLycheeArguments(options: Pick<LinkCheckOptions, "outputDir" | "site">): string[];
export function checkLinks(options: LinkCheckOptions): Promise<number>;
