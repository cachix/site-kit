import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface VersionLink {
  label: string;
  href: string;
  ariaLabel?: string;
}

export interface DocsLink {
  label: string;
  href: string;
  current?: boolean;
}

export interface Props {
  repositoryHref?: string;
  repositoryLabel?: string;
  repositoryText?: string;
  metadataEndpoint?: string | false;
  version?: boolean | VersionLink;
  discordHref?: string | false;
  rss?: boolean | DocsLink;
  blog?: DocsLink;
  docs?: DocsLink;
  menuLabel?: string;
  theme?: boolean;
  themeLabel?: string;
}

declare const NavbarActions: AstroComponentFactory & ((props: Props) => unknown);

export default NavbarActions;
