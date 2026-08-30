import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export interface Props {
  version: string;
  kind?: 'new' | 'changed';
  label?: string;
}

declare const VersionCompatibility: AstroComponentFactory & ((props: Props) => unknown);

export default VersionCompatibility;
