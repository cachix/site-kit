import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  class?: string;
}

declare const LatestPostRegion: AstroComponentFactory & ((props: Props) => unknown);

export default LatestPostRegion;
