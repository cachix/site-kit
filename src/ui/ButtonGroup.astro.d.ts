import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  as?: 'div' | 'nav';
  class?: string;
  'aria-label'?: string;
}

declare const ButtonGroup: AstroComponentFactory & ((props: Props) => unknown);

export default ButtonGroup;
