export interface FooterLink {
  href: string;
  label: string;
  icon?: string;
  external?: boolean;
}

export interface FooterColumn {
  heading?: string;
  links: FooterLink[];
}

export interface FooterOptions {
  title?: string;
  description?: string;
  columns?: FooterColumn[];
  copyright?: string;
}

export interface SiteKitStarlightOptions {
  hideLandingHero?: boolean;
  footer?: boolean | FooterOptions;
  navbar?: boolean;
  themeToggle?: boolean;
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
