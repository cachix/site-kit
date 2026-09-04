export interface SiteKitStarlightOptions {
  hideLandingHero?: boolean;
  navbar?: boolean;
  ui?: boolean;
  terminalCopy?: boolean;
}

export interface SiteKitStarlightPlugin {
  name: string;
  hooks: {
    "config:setup": (options: any) => void;
  };
}

export function siteKitStarlight(options?: SiteKitStarlightOptions): SiteKitStarlightPlugin;
