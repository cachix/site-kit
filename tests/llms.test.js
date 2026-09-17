import assert from "node:assert/strict";
import test from "node:test";

import { siteLlmActionsOptions } from "../src/starlight/llms.js";

test("serves agent markdown with alternate links and llms.txt by default", () => {
  assert.deepEqual(siteLlmActionsOptions("Shared docs."), {
    markdownUrl: "/{slug}/index.md",
    renderMarkdown: "simple",
    linkAlternate: true,
    llmsTxt: { description: "Shared docs." },
  });
});

test("merges consumer llms.txt options with the description", () => {
  const options = siteLlmActionsOptions("Shared docs.", {
    renderMarkdown: "raw",
    llmsTxt: { exclude: ["blog/**"] },
  });
  assert.equal(options.renderMarkdown, "raw");
  assert.equal(options.linkAlternate, true);
  assert.deepEqual(options.llmsTxt, { description: "Shared docs.", exclude: ["blog/**"] });
});

test("lets consumers disable llms.txt", () => {
  assert.equal(siteLlmActionsOptions("Shared docs.", { llmsTxt: false }).llmsTxt, false);
});

test("requires a description", () => {
  assert.throws(() => siteLlmActionsOptions(""), TypeError);
  assert.throws(() => siteLlmActionsOptions(undefined), TypeError);
});
