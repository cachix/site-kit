export interface LinkCheckOptions {
  outputDir: string;
  site?: string;
}

export interface LinkCheckResult {
  filesChecked: number;
  failures: string[];
}

export function checkInternalLinks(options: LinkCheckOptions): Promise<LinkCheckResult>;

