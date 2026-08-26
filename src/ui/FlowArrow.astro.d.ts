import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  label?: string;
  axis?: 'horizontal' | 'vertical';
  direction?: 'forward' | 'reverse';
  packet?: 'dot' | 'bars';
  packetCount?: 1 | 2 | 3;
  labelPosition?: 'before' | 'after';
  arrival?: boolean;
  animated?: boolean;
  decorative?: boolean;
  ariaLabel?: string;
  class?: string;
}

declare const FlowArrow: AstroComponentFactory & ((props: Props) => unknown);

export default FlowArrow;
