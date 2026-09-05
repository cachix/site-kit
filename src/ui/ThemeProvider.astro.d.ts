import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  storageKey?: string;
  lightColor?: string;
  darkColor?: string;
}

declare const ThemeProvider: AstroComponentFactory & ((props: Props) => unknown);

export default ThemeProvider;
