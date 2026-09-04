import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  ariaLabel?: string;
  class?: string;
  href?: string;
}

declare const NavbarBrand: AstroComponentFactory & ((props: Props) => unknown);

export default NavbarBrand;
