const promptPattern = /^\s*\$\s(.*)$/;

function scanShellLine(line, initialState = {}) {
  let quote = initialState.quote;
  let atTokenStart = initialState.atTokenStart ?? true;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      atTokenStart = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if ((character === "'" || character === '"') && !quote) {
      quote = character;
      atTokenStart = false;
      continue;
    }
    if (character === quote) {
      quote = undefined;
      atTokenStart = false;
      continue;
    }
    if (character === "#" && !quote && atTokenStart) {
      return {
        text: line.slice(0, index).trimEnd(),
        quote,
        escaped: false,
        atTokenStart,
      };
    }
    if (!quote && /\s/.test(character)) {
      atTokenStart = true;
      continue;
    }
    if (!quote && /[;|&()<>]/.test(character)) {
      atTokenStart = true;
      continue;
    }
    atTokenStart = false;
  }

  return { text: line, quote, escaped, atTokenStart };
}

function withoutLineContinuation(line) {
  const withoutBackslash = line.trimEnd().slice(0, -1);
  return {
    text: withoutBackslash.trimEnd(),
    separator: /\s$/.test(withoutBackslash) ? " " : "",
  };
}

export function extractTerminalCommandGroups(code, language = "bash") {
  const lines = code.split("\n");
  const commands = [];
  let current;
  const supportsContinuation = ["bash", "console", "sh", "shell"].includes(language);

  for (const [lineIndex, line] of lines.entries()) {
    const prompted = line.match(promptPattern);
    if (prompted) {
      const scanned = scanShellLine(prompted[1]);
      const continues = supportsContinuation && scanned.escaped;
      const continuation = continues ? withoutLineContinuation(scanned.text) : undefined;
      current = {
        lineIndex,
        lines: [continuation?.text ?? scanned.text],
        separators: continuation ? [continuation.separator] : [],
        quote: scanned.quote,
        atTokenStart: scanned.atTokenStart,
      };
      commands.push(current);
      if (!continues) current = undefined;
      continue;
    }

    if (current) {
      const scanned = scanShellLine(line, current);
      const continuation = scanned.escaped ? withoutLineContinuation(scanned.text) : undefined;
      if (current.separators.at(-1) === "" && /^\s/.test(continuation?.text ?? scanned.text)) {
        current.separators[current.separators.length - 1] = " ";
      }
      current.lines.push((continuation?.text ?? scanned.text).trim());
      if (continuation) current.separators.push(continuation.separator);
      current.quote = scanned.quote;
      current.atTokenStart = scanned.atTokenStart;
      if (!scanned.escaped) current = undefined;
    }
  }

  return commands
    .map(({ lineIndex, lines: commandLines, separators }) => ({
      lineIndex,
      command: commandLines
        .slice(1)
        .reduce(
          (joined, segment, index) => `${joined}${separators[index] ?? " "}${segment}`,
          commandLines[0],
        )
        .trim(),
    }))
    .filter(({ command }) => command.length > 0);
}

export function extractTerminalCommands(code, language = "bash") {
  const commands = extractTerminalCommandGroups(code, language);
  return commands.length ? commands.map(({ command }) => command).join("\n") : code;
}

export function extractTerminalCopyText(target, {
  lineSelector = "[data-csk-copy-line]",
  ignoreSelector = "[data-csk-copy-ignore]",
} = {}) {
  const lines = [...target.querySelectorAll(lineSelector)];
  if (!lines.length) return target.textContent ?? "";
  return lines.map((line) => {
    const copy = line.cloneNode(true);
    copy.querySelectorAll(ignoreSelector).forEach((node) => node.remove());
    return (copy.textContent ?? "").replaceAll("\u00a0", "");
  }).join("\n");
}

export function initializeTerminalCopyButtons({
  root = globalThis.document,
  navigatorObject = globalThis.navigator,
  setTimeoutFunction = globalThis.setTimeout,
} = {}) {
  if (!root?.querySelectorAll) return;
  const documentObject = root.ownerDocument ?? root;
  for (const button of root.querySelectorAll("[data-csk-copy-target]")) {
    if (button.dataset.cskCopyConnected !== undefined) continue;
    button.dataset.cskCopyConnected = "";
    button.addEventListener("click", async () => {
      const target = documentObject.getElementById(button.dataset.cskCopyTarget ?? "");
      if (!target || !navigatorObject?.clipboard?.writeText) return;
      const text = extractTerminalCopyText(target, {
        lineSelector: button.dataset.cskCopyLines,
        ignoreSelector: button.dataset.cskCopyIgnore,
      });
      await navigatorObject.clipboard.writeText(text);
      const idleLabel = button.textContent;
      const successLabel = button.dataset.cskCopySuccess;
      if (!successLabel) return;
      button.textContent = successLabel;
      button.dataset.cskCopyState = "copied";
      setTimeoutFunction(() => {
        button.textContent = idleLabel;
        delete button.dataset.cskCopyState;
      }, Number(button.dataset.cskCopyDuration) || 1500);
    });
  }
}

export function terminalCopyPlugin() {
  return {
    name: "Cachix terminal copy",
    hooks: {
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        if (!codeBlock.code.split("\n").some((line) => promptPattern.test(line))) return;
        const commands = extractTerminalCommandGroups(codeBlock.code, codeBlock.language);
        const copy = findElement(renderData.blockAst, (node) => hasClass(node, "copy"));
        if (!copy?.parent) return;
        const copyIndex = copy.parent.children.indexOf(copy.node);
        if (copyIndex < 0) return;
        if (!commands.length) {
          copy.parent.children.splice(copyIndex, 1);
          return;
        }
        const code = findElement(renderData.blockAst, (node) => node.tagName === "code");
        if (!code) return;
        const replacements = commands.map(({ lineIndex, command }) => {
          const line = code.node.children[lineIndex];
          if (!line?.children) return undefined;
          const lineCopy = cloneNode(copy.node);
          lineCopy.properties.className = ["copy", "terminal-line-copy"];
          const button = findElement(lineCopy, (node) => node.tagName === "button")?.node;
          if (!button) return undefined;
          if ("dataCode" in button.properties) button.properties.dataCode = command;
          else button.properties["data-code"] = command;
          return { line, lineCopy };
        });
        if (replacements.some((replacement) => !replacement)) return;
        copy.parent.children.splice(copyIndex, 1);
        for (const { line, lineCopy } of replacements) {
          line.properties.className = [
            ...(line.properties.className ?? []),
            "terminal-command-start",
          ];
          line.children.push(lineCopy);
        }
      },
    },
  };
}

function findElement(node, predicate, parent) {
  if (!node || node.type !== "element") return undefined;
  if (predicate(node)) return { node, parent };
  for (const child of node.children ?? []) {
    const result = findElement(child, predicate, node);
    if (result) return result;
  }
  return undefined;
}

function hasClass(node, className) {
  return node.properties?.className?.includes(className);
}

function cloneNode(node) {
  return {
    ...node,
    properties: { ...node.properties },
    children: node.children?.map(cloneNode) ?? [],
  };
}
