import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { HTMLAttributes } from 'astro/types';

export interface Props extends HTMLAttributes<'div'> {
  title?: string;
  status?: string;
  class?: string;
  headerClass?: string;
  bodyClass?: string;
  dotsClass?: string;
  titleClass?: string;
  statusClass?: string;
  headerLayout?: 'inline' | 'centered';
}

declare const TerminalFrame: AstroComponentFactory & ((props: Props) => unknown);

export default TerminalFrame;
