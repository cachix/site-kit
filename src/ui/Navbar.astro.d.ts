import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  ariaLabel?: string;
  class?: string;
  fixed?: boolean;
  sticky?: boolean;
}

declare const Navbar: AstroComponentFactory & ((props: Props) => unknown);

export default Navbar;
