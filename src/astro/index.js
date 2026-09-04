import { createGitHubMetadataHandler } from "../cloudflare/index.js";

export function siteKitAstro({ github } = {}) {
  if (!github) {
    return { name: "@cachix/site-kit/astro", hooks: {} };
  }

  const { endpoint = "/api/github", ...options } = github;
  if (!endpoint.startsWith("/") || endpoint.includes("?") || endpoint.includes("#")) {
    throw new TypeError("github.endpoint must be an absolute pathname");
  }
  const handler = createGitHubMetadataHandler(options);

  return {
    name: "@cachix/site-kit/astro",
    hooks: {
      "astro:server:setup"({ server }) {
        server.middlewares.use(async (request, response, next) => {
          const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
          if (request.method !== "GET" || pathname !== endpoint) {
            next();
            return;
          }

          try {
            const result = await handler({
              env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
            });
            response.statusCode = result.status;
            for (const [name, value] of result.headers) response.setHeader(name, value);
            response.end(Buffer.from(await result.arrayBuffer()));
          } catch (error) {
            next(error);
          }
        });
      },
    },
  };
}
