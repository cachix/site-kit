import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface FooterLink {
  href: string;
  label: string;
  icon?: string;
  external?: boolean;
}

export interface FooterColumn {
  heading?: string;
  links: FooterLink[];
}

export interface Props {
  title: string;
  description?: string;
  columns?: FooterColumn[];
  copyright?: string;
  class?: string;
}

declare const SiteFooter: AstroComponentFactory & ((props: Props) => unknown);

export default SiteFooter;
