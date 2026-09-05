import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { HTMLAttributes } from 'astro/types';

export interface Props extends HTMLAttributes<'section'> {
  class?: string;
  glow?: boolean;
}

declare const LandingHero: AstroComponentFactory & ((props: Props) => unknown);

export default LandingHero;
