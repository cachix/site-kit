import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  current?: boolean;
  href: string;
}

declare const NavbarLink: AstroComponentFactory & ((props: Props) => unknown);

export default NavbarLink;
