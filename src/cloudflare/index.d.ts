export interface BasicAuthOptions {
  username?: string;
  passwordBinding?: string;
  realm?: string;
}

export interface CloudflareContext {
  env?: Record<string, unknown> & {
    ASSETS?: { fetch(request: Request): Promise<Response> };
  };
  request: Request;
  next(): Response | Promise<Response>;
}

export function createBasicAuthMiddleware(options?: BasicAuthOptions): (
  context: CloudflareContext,
) => Promise<Response>;

export interface GitHubMetadataOptions {
  repository: string;
  userAgent?: string;
  ttl?: number;
  includeRelease?: boolean;
  fetch?: typeof globalThis.fetch;
}

export function createGitHubMetadataHandler(options: GitHubMetadataOptions): (
  context?: { env?: { GITHUB_TOKEN?: string } },
) => Promise<Response>;

export function formatGitHubCount(value: number): string | undefined;


export interface MarkdownMiddlewareOptions {
  fileName?: string;
  redirect?: boolean;
}

export function createMarkdownMiddleware(options?: MarkdownMiddlewareOptions): (
  context: CloudflareContext,
) => Promise<Response>;

export function prefersMarkdown(accept: string | null | undefined): boolean;
