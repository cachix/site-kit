import assert from "node:assert/strict";
import test from "node:test";

import {
  createBasicAuthMiddleware,
  createMarkdownMiddleware,
  createGitHubMetadataHandler,
  formatGitHubCount,
  prefersMarkdown,
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

test("detects agents that prefer markdown", () => {
  assert.equal(prefersMarkdown("text/markdown, text/html, */*"), true);
  assert.equal(prefersMarkdown("text/markdown, text/plain;q=0.9, */*;q=0.8"), true);
  assert.equal(prefersMarkdown("text/markdown;q=1.0"), true);
  assert.equal(prefersMarkdown("text/html, text/markdown;q=0.5"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0, text/html"), false);
  assert.equal(prefersMarkdown("text/html,application/xhtml+xml,*/*;q=0.8"), false);
  assert.equal(prefersMarkdown("*/*"), false);
  assert.equal(prefersMarkdown(null), false);
});

test("serves prebuilt markdown to agents from Pages assets", async () => {
  const middleware = createMarkdownMiddleware();
  const html = new Response("<html>");
  const fetched = [];
  const context = (accept, url = "https://docs.invalid/guides/example/", method = "GET") => ({
    env: {
      ASSETS: {
        fetch: async (request) => {
          fetched.push(request.url);
          return request.url.endsWith("/guides/example/index.md")
            ? new Response("# Example", { headers: { "Content-Type": "text/plain", ETag: '"1"' } })
            : new Response("missing", { status: 404 });
        },
      },
    },
    request: new Request(url, { method, headers: accept ? { Accept: accept } : {} }),
    next: () => html,
  });

  const markdown = await middleware(context("text/markdown, text/html, */*"));
  assert.equal(markdown.status, 200);
  assert.equal(await markdown.text(), "# Example");
  assert.equal(markdown.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(markdown.headers.get("Content-Location"), "/guides/example/index.md");
  assert.equal(markdown.headers.get("Vary"), "Accept");
  assert.equal(markdown.headers.get("ETag"), '"1"');
  assert.deepEqual(fetched, ["https://docs.invalid/guides/example/index.md"]);

  assert.equal(await middleware(context("text/html,*/*;q=0.8")), html);
  assert.equal(await middleware(context("text/markdown", "https://docs.invalid/missing/")), html);
  assert.equal(await middleware(context("text/markdown", "https://docs.invalid/guides/example/index.md")), html);
  assert.equal(await middleware(context("text/markdown", "https://docs.invalid/guides/example/", "POST")), html);
  assert.equal(await middleware({ ...context("text/markdown"), env: {} }), html);
});

test("passes conditional markdown requests through unchanged", async () => {
  const middleware = createMarkdownMiddleware();
  const response = await middleware({
    env: { ASSETS: { fetch: async () => new Response(null, { status: 304, headers: { ETag: '"1"' } }) } },
    request: new Request("https://docs.invalid/", { headers: { Accept: "text/markdown" } }),
    next: () => new Response("<html>"),
  });
  assert.equal(response.status, 304);
  assert.equal(response.headers.get("Vary"), "Accept");
});

test("can redirect agents to the markdown file instead", async () => {
  const middleware = createMarkdownMiddleware({ redirect: true, fileName: "page.md" });
  const response = await middleware({
    request: new Request("https://docs.invalid/guides/example/", { headers: { Accept: "text/markdown" } }),
    next: () => new Response("<html>"),
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/guides/example/page.md");
  assert.equal(response.headers.get("Vary"), "Accept");
  assert.throws(() => createMarkdownMiddleware({ fileName: "nested/index.md" }), TypeError);
});
