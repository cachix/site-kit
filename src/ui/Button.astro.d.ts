import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  href?: string;
  variant?: 'primary' | 'secondary' | 'quiet';
  class?: string;
  type?: 'button' | 'submit' | 'reset';
}

declare const Button: AstroComponentFactory & ((props: Props) => unknown);

export default Button;
