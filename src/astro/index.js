import { createGitHubMetadataHandler } from "../cloudflare/index.js";

const rssEndpoint = new URL("./RssEndpoint.js", import.meta.url);

export function siteKitAstro({ github, rss } = {}) {
  const rssOptions = rss && {
    collection: "blog",
    endpoint: "/blog/rss.xml",
    itemBase: "/blog/",
    ...rss,
  };
  if (rssOptions && (!rssOptions.endpoint.startsWith("/") || rssOptions.endpoint.includes("?") || rssOptions.endpoint.includes("#"))) {
    throw new TypeError("rss.endpoint must be an absolute pathname");
  }

  const hooks = {
    "astro:config:setup"({ injectRoute, injectScript, updateConfig }) {
      injectScript("head-inline", "document.documentElement.dataset.cskReveals = '';");
      injectScript("page", `
        import { initializeViewportReveals } from "@cachix/site-kit/motion";

        const key = Symbol.for("cachix.site-kit.viewport-reveals");
        globalThis[key]?.abort();
        const controller = new AbortController();
        globalThis[key] = controller;
        let reveals;
        const initialize = () => {
          reveals?.destroy();
          reveals = initializeViewportReveals();
        };
        initialize();
        document.addEventListener("astro:page-load", initialize, { signal: controller.signal });
        document.addEventListener("astro:before-swap", () => reveals?.destroy(), { signal: controller.signal });
      `);
      if (rssOptions) {
        injectRoute({ pattern: rssOptions.endpoint, entrypoint: rssEndpoint });
        updateConfig({
          vite: {
            define: {
              "import.meta.env.CSK_RSS_CONFIG": JSON.stringify(rssOptions),
            },
          },
        });
      }
    },
  };

  if (!github) return { name: "@cachix/site-kit/astro", hooks };

  const { endpoint = "/api/github", ...options } = github;
  if (!endpoint.startsWith("/") || endpoint.includes("?") || endpoint.includes("#")) {
    throw new TypeError("github.endpoint must be an absolute pathname");
  }
  const handler = createGitHubMetadataHandler(options);

  hooks["astro:server:setup"] = ({ server }) => {
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
  };

  return {
    name: "@cachix/site-kit/astro",
    hooks,
  };
}
