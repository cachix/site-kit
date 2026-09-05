import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  label: string;
  storageKey?: string;
}

declare const ThemeToggle: AstroComponentFactory & ((props: Props) => unknown);

export default ThemeToggle;
