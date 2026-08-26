import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  title?: string;
  status?: string;
  class?: string;
}

declare const TerminalFrame: AstroComponentFactory & ((props: Props) => unknown);

export default TerminalFrame;
