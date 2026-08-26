import assert from "node:assert/strict";
import test from "node:test";

import {
  createBasicAuthMiddleware,
  createGitHubMetadataHandler,
  formatGitHubCount,
} from "../src/cloudflare/index.js";

test("protects Cloudflare previews", async () => {
  const middleware = createBasicAuthMiddleware({ realm: "casita preview" });
  const nextResponse = new Response("ok");
  const request = (authorization) => new Request("https://preview.invalid", {
    headers: authorization ? { Authorization: authorization } : {},
  });
  const context = (authorization, password = "secret") => ({
    env: { BASIC_AUTH_PASSWORD: password },
    request: request(authorization),
    next: () => nextResponse,
  });

  assert.equal((await middleware(context())).status, 401);
  assert.equal(
    (await middleware(context(`Basic ${btoa("friends:wrong")}`))).status,
    401,
  );
  assert.equal(
    await middleware(context(`Basic ${btoa("friends:secret")}`)),
    nextResponse,
  );
  assert.equal((await middleware(context(undefined, ""))).status, 503);
});

test("fetches cached GitHub metadata", async () => {
  const calls = [];
  const handler = createGitHubMetadataHandler({
    repository: "cachix/casita",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith("/releases/latest")
        ? Response.json({ tag_name: "v1.2.3" })
        : Response.json({ stargazers_count: 1234 });
    },
  });
  const response = await handler({ env: { GITHUB_TOKEN: "token" } });

  assert.deepEqual(await response.json(), { stars: 1234, release: "v1.2.3" });
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.get("Authorization"), "Bearer token");
});

test("degrades GitHub failures to null metadata", async () => {
  const handler = createGitHubMetadataHandler({
    repository: "cachix/casita",
    fetch: async () => {
      throw new Error("offline");
    },
  });
  const response = await handler();
  assert.deepEqual(await response.json(), { stars: null, release: null });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("preserves partial GitHub metadata", async () => {
  const handler = createGitHubMetadataHandler({
    repository: "cachix/casita",
    fetch: async (url) => {
      if (url.endsWith("/releases/latest")) throw new Error("offline");
      return Response.json({ stargazers_count: 42 });
    },
  });
  const response = await handler();
  assert.deepEqual(await response.json(), { stars: 42, release: null });
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600");
});

test("formats GitHub counts consistently", () => {
  assert.equal(formatGitHubCount(999), "999");
  assert.equal(formatGitHubCount(1200), "1.2k");
  assert.equal(formatGitHubCount(12_400), "12k");
  assert.equal(formatGitHubCount(-1), undefined);
});
