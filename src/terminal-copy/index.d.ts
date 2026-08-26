export interface TerminalCommandGroup {
  lineIndex: number;
  command: string;
}

export function extractTerminalCommandGroups(
  code: string,
  language?: string,
): TerminalCommandGroup[];
export function extractTerminalCommands(code: string, language?: string): string;
export function terminalCopyPlugin(): {
  name: string;
  hooks: {
    postprocessRenderedBlock(options: {
      codeBlock: { code: string; language: string };
      renderData: { blockAst: unknown };
    }): void;
  };
};

