import type { AstroIntegration } from "astro";

export interface GitHubMetadataOptions {
  repository: string;
  endpoint?: string;
  userAgent?: string;
  ttl?: number;
  includeRelease?: boolean;
  fetch?: typeof globalThis.fetch;
}

export interface SiteKitAstroOptions {
  github?: GitHubMetadataOptions;
}

export function siteKitAstro(options?: SiteKitAstroOptions): AstroIntegration;
