import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  href: string;
  title: string;
  date?: string;
  label?: string;
  action?: string;
  class?: string;
}

declare const LatestPostBanner: AstroComponentFactory & ((props: Props) => unknown);

export default LatestPostBanner;
