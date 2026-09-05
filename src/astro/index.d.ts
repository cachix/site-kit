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
  rss?: {
    title: string;
    description: string;
    collection?: string;
    endpoint?: string;
    itemBase?: string;
  };
}

export function siteKitAstro(options?: SiteKitAstroOptions): AstroIntegration;
