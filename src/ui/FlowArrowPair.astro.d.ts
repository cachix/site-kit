import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  outboundLabel?: string;
  returnLabel?: string;
  arrival?: boolean;
  animated?: boolean;
  decorative?: boolean;
  ariaLabel?: string;
  class?: string;
}

declare const FlowArrowPair: AstroComponentFactory & ((props: Props) => unknown);

export default FlowArrowPair;
