import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTerminalCommands,
  extractTerminalCopyText,
  terminalCopyPlugin,
} from "../src/terminal-copy/index.js";

test("copies prompted commands without output", () => {
  const session = `# Check secrets
$ secretspec check
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
  assert.equal(
    extractTerminalCommands(session, "console"),
    "secretspec init --project site-kit --profile production",
  );
});

test("preserves token boundaries across shell continuations", () => {
  assert.equal(extractTerminalCommands("$ printf foo\\\nbar", "bash"), "printf foobar");
  assert.equal(extractTerminalCommands("$ printf foo \\\nbar", "bash"), "printf foo bar");
  assert.equal(extractTerminalCommands("$ printf foo\\\n    bar", "bash"), "printf foo bar");
});

test("preserves quoted hashes", () => {
  assert.equal(
    extractTerminalCommands('$ command "value # stays" https://example.test/#id'),
    'command "value # stays" https://example.test/#id',
  );
  const continued = `$ printf "%s\\n" "hello \\
    # world"`;
  assert.equal(
    extractTerminalCommands(continued, "bash"),
    'printf "%s\\n" "hello # world"',
  );
});

test("does not join continuations outside shell languages", () => {
  const session = `$ command \\
    --flag
output`;
  assert.equal(
    extractTerminalCommands(session, "text"),
    "command \\",
  );
});

test("recognizes shell annotation boundaries", () => {
  assert.equal(extractTerminalCommands("$ command;# note"), "command;");
  assert.equal(extractTerminalCommands("$ printf foo\\ #bar"), "printf foo\\ #bar");
});

test("leaves command-only blocks unchanged", () => {
  assert.equal(extractTerminalCommands("npm install\nnpm test"), "npm install\nnpm test");
});

test("copies rendered terminal lines without interactive controls", () => {
  const ignored = [];
  const line = (text, cleanText) => ({
    cloneNode() {
      const copy = {
        textContent: text,
        querySelectorAll(selector) {
          assert.equal(selector, ".node, .remove");
          return [{
            remove() {
              ignored.push(text);
              copy.textContent = cleanText;
            },
          }];
        },
      };
      return copy;
    },
  });
  const target = {
    querySelectorAll(selector) {
      assert.equal(selector, ".line");
      return [line("one control", "one\u00a0"), line("two control", "two")];
    },
  };

  assert.equal(extractTerminalCopyText(target, {
    lineSelector: ".line",
    ignoreSelector: ".node, .remove",
  }), "one\ntwo");
  assert.deepEqual(ignored, ["one control", "two control"]);
});

test("installs one copy button per prompted command", () => {
  const blockAst = terminalBlockAst(3);
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "console", code: "$ one\noutput\n$ two" },
    renderData: { blockAst },
  });
  const lines = blockAst.children[0].children[0].children;
  assert.deepEqual(
    lines.map((line) => line.properties.className),
    [
      ["ec-line", "terminal-command-start"],
      ["ec-line"],
      ["ec-line", "terminal-command-start"],
    ],
  );
  assert.equal(lines[0].children[0].children[0].properties.dataCode, "one");
  assert.equal(lines[2].children[0].children[0].properties.dataCode, "two");
  assert.equal(blockAst.children.length, 1);
});

test("keeps the default button for command-only shell blocks", () => {
  const blockAst = terminalBlockAst(1);
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "bash", code: "secretspec-update" },
    renderData: { blockAst },
  });

  const line = blockAst.children[0].children[0].children[0];
  assert.deepEqual(line.properties.className, ["ec-line"]);
  assert.equal(line.children.length, 0);
  assert.equal(blockAst.children[1].properties.className[0], "copy");
});

test("installs one copy button for a multiline command", () => {
  const blockAst = terminalBlockAst(4);
  const code = `$ command \\
  --first \\
  --second
output`;
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: {
      language: "bash",
      code,
    },
    renderData: { blockAst },
  });

  const lines = blockAst.children[0].children[0].children;
  assert.equal(lines[0].children[0].children[0].properties.dataCode, "command --first --second");
  assert.equal(lines[1].children.length, 0);
  assert.equal(lines[2].children.length, 0);
});

test("supports prompted terminal languages without joining continuations", () => {
  const blockAst = terminalBlockAst(2);
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "zsh", code: "$ command --flag\noutput" },
    renderData: { blockAst },
  });

  const line = blockAst.children[0].children[0].children[0];
  assert.equal(line.children[0].properties.className[1], "terminal-line-copy");
  assert.equal(line.children[0].children[0].properties.dataCode, "command --flag");
});

test("handles prompted blocks without terminal frames", () => {
  const blockAst = terminalBlockAst(1, false);
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "bash", code: "$ command" },
    renderData: { blockAst },
  });

  const line = blockAst.children[0].children[0].children[0];
  assert.equal(line.children[0].properties.className[1], "terminal-line-copy");
  assert.equal(blockAst.children.length, 1);
});

test("removes the default button for empty prompted annotations", () => {
  const blockAst = terminalBlockAst(1);
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "bash", code: "$ # note" },
    renderData: { blockAst },
  });

  const line = blockAst.children[0].children[0].children[0];
  assert.equal(line.children.length, 0);
  assert.equal(blockAst.children.length, 1);
});

test("keeps the default button when its AST cannot be cloned", () => {
  const blockAst = terminalBlockAst(1);
  blockAst.children[1].children = [];
  terminalCopyPlugin().hooks.postprocessRenderedBlock({
    codeBlock: { language: "bash", code: "$ command" },
    renderData: { blockAst },
  });

  assert.equal(blockAst.children.length, 2);
  assert.equal(blockAst.children[1].properties.className[0], "copy");
});

function terminalBlockAst(lineCount, isTerminal = true) {
  return {
    type: "element",
    tagName: "figure",
    properties: { className: isTerminal ? ["frame", "is-terminal"] : ["frame"] },
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
