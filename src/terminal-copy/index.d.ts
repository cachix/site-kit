export interface TerminalCommandGroup {
  lineIndex: number;
  command: string;
}

export function extractTerminalCommandGroups(
  code: string,
  language?: string,
): TerminalCommandGroup[];
export function extractTerminalCommands(code: string, language?: string): string;
export function extractTerminalCopyText(
  target: Element,
  options?: {
    lineSelector?: string;
    ignoreSelector?: string;
  },
): string;
export function initializeTerminalCopyButtons(options?: {
  root?: ParentNode;
  navigatorObject?: Pick<Navigator, "clipboard">;
  setTimeoutFunction?: typeof setTimeout;
}): void;
export function terminalCopyPlugin(): {
  name: string;
  hooks: {
    postprocessRenderedBlock(options: {
      codeBlock: { code: string; language: string };
      renderData: { blockAst: unknown };
    }): void;
  };
};
