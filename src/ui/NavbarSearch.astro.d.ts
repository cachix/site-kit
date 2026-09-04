import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  action?: string;
  ariaLabel?: string;
  name?: string;
  pagefindBase?: string;
  placeholder?: string;
}

declare const NavbarSearch: AstroComponentFactory & ((props: Props) => unknown);

export default NavbarSearch;
