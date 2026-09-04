import assert from "node:assert/strict";
import test from "node:test";

import { siteKitAstro } from "../src/astro/index.js";

test("serves GitHub metadata during Astro development", async () => {
  const integration = siteKitAstro({
    github: {
      repository: "cachix/site-kit",
      fetch: async (url) => url.endsWith("/releases/latest")
        ? Response.json({ tag_name: "v1.2.3", html_url: "https://github.com/cachix/site-kit/releases/tag/v1.2.3" })
        : Response.json({ stargazers_count: 1234 }),
    },
  });
  let middleware;
  integration.hooks["astro:server:setup"]({
    server: {
      middlewares: {
        use(value) {
          middleware = value;
        },
      },
    },
  });

  const headers = new Headers();
  const response = {
    statusCode: 0,
    setHeader(name, value) {
      headers.set(name, value);
    },
    end(value) {
      this.body = value;
    },
  };
  await middleware({ method: "GET", url: "/api/github" }, response, assert.fail);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body.toString()), {
    stars: 1234,
    release: "v1.2.3",
    releaseUrl: "https://github.com/cachix/site-kit/releases/tag/v1.2.3",
  });
  assert.match(headers.get("content-type"), /application\/json/);
});

test("passes unrelated development requests through", () => {
  const integration = siteKitAstro({
    github: { repository: "cachix/site-kit" },
  });
  let middleware;
  integration.hooks["astro:server:setup"]({
    server: {
      middlewares: {
        use(value) {
          middleware = value;
        },
      },
    },
  });
  let passed = false;
  middleware({ method: "GET", url: "/docs" }, {}, () => {
    passed = true;
  });
  assert.equal(passed, true);
});
