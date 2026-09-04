export interface LinkCheckOptions {
  outputDir: string;
  site?: string;
}

export interface LinkCheckResult {
  filesChecked: number;
  linksChecked: number;
  fragmentsChecked: number;
  assetsChecked: number;
  failures: string[];
}

export function checkInternalLinks(options: LinkCheckOptions): Promise<LinkCheckResult>;
