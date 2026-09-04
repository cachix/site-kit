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

  const missing = await middleware(context());
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get("Cache-Control"), "no-store");
  assert.equal(
    missing.headers.get("WWW-Authenticate"),
    'Basic realm="casita preview", charset="UTF-8"',
  );
  assert.equal(
    (await middleware(context(`Basic ${btoa("friends:wrong")}`))).status,
    401,
  );
  assert.equal(
    await middleware(context(`Basic ${btoa("friends:secret")}`)),
    nextResponse,
  );
  const unconfigured = await middleware(context(undefined, ""));
  assert.equal(unconfigured.status, 503);
  assert.equal(unconfigured.headers.get("Cache-Control"), "no-store");
});

test("rejects malformed Basic credentials", async () => {
  const middleware = createBasicAuthMiddleware();
  const context = (authorization) => ({
    env: { BASIC_AUTH_PASSWORD: "secret" },
    request: new Request("https://preview.invalid", {
      headers: { Authorization: authorization },
    }),
    next: () => new Response("ok"),
  });

  for (const authorization of ["Bearer token", "Basic !!!", `Basic ${btoa("friends")}`]) {
    assert.equal((await middleware(context(authorization))).status, 401);
  }
});

test("supports project-specific auth settings and passwords containing colons", async () => {
  const middleware = createBasicAuthMiddleware({
    username: "reviewer",
    passwordBinding: "PREVIEW_PASSWORD",
    realm: 'docs "preview"',
  });
  const nextResponse = new Response("ok");
  const context = {
    env: { PREVIEW_PASSWORD: "secret:part" },
    request: new Request("https://preview.invalid", {
      headers: { Authorization: `Basic ${btoa("reviewer:secret:part")}` },
    }),
    next: () => nextResponse,
  };

  assert.equal(await middleware(context), nextResponse);

  context.request = new Request("https://preview.invalid");
  assert.equal(
    (await middleware(context)).headers.get("WWW-Authenticate"),
    'Basic realm="docs preview", charset="UTF-8"',
  );
});

test("fetches cached GitHub metadata", async () => {
  const calls = [];
  const handler = createGitHubMetadataHandler({
    repository: "cachix/casita",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith("/releases/latest")
        ? Response.json({ tag_name: "v1.2.3", html_url: "https://github.com/cachix/casita/releases/tag/v1.2.3" })
        : Response.json({ stargazers_count: 1234 });
    },
  });
  const response = await handler({ env: { GITHUB_TOKEN: "token" } });

  assert.deepEqual(await response.json(), {
    stars: 1234,
    release: "v1.2.3",
    releaseUrl: "https://github.com/cachix/casita/releases/tag/v1.2.3",
  });
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
  assert.deepEqual(await response.json(), { stars: null, release: null, releaseUrl: null });
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
  assert.deepEqual(await response.json(), { stars: 42, release: null, releaseUrl: null });
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=3600");
});

test("formats GitHub counts consistently", () => {
  assert.equal(formatGitHubCount(999), "999");
  assert.equal(formatGitHubCount(1200), "1.2k");
  assert.equal(formatGitHubCount(12_400), "12k");
  assert.equal(formatGitHubCount(-1), undefined);
});
