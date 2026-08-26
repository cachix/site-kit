import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTerminalCommands,
  terminalCopyPlugin,
} from "../src/terminal-copy/index.js";

test("copies prompted commands without output", () => {
  const session = `$ secretspec check
All secrets are set
$ secretspec run -- npm start`;
  assert.equal(
    extractTerminalCommands(session),
    "secretspec check\nsecretspec run -- npm start",
  );
});

test("joins shell continuations and removes annotations", () => {
  const session = `$ secretspec init \\
  --project site-kit \\
  --profile production # current`;
  assert.equal(
    extractTerminalCommands(session, "bash"),
    "secretspec init --project site-kit --profile production",
  );
});

test("preserves quoted hashes", () => {
  assert.equal(
    extractTerminalCommands('$ command "value # stays" https://example.test/#id'),
    'command "value # stays" https://example.test/#id',
  );
});

test("leaves command-only blocks unchanged", () => {
  assert.equal(extractTerminalCommands("npm install\nnpm test"), "npm install\nnpm test");
});

test("installs one copy button per prompted command", () => {
  const blockAst = terminalBlockAst(3);
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "console", code: "$ one\noutput\n$ two" },
    renderData: { blockAst },
  });
  const lines = blockAst.children[0].children[0].children;
  assert.equal(lines[0].children[0].children[0].properties.dataCode, "one");
  assert.equal(lines[2].children[0].children[0].properties.dataCode, "two");
  assert.equal(blockAst.children.length, 1);
});

function terminalBlockAst(lineCount) {
  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["frame", "is-terminal"] },
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: Array.from({ length: lineCount }, () => ({
              type: "element",
              tagName: "div",
              properties: { className: ["ec-line"] },
              children: [],
            })),
          },
        ],
      },
      {
        type: "element",
        tagName: "div",
        properties: { className: ["copy"] },
        children: [
          {
            type: "element",
            tagName: "button",
            properties: { dataCode: "session" },
            children: [],
          },
        ],
      },
    ],
  };
}

