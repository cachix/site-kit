export const navbarIcons: Readonly<Record<'github' | 'discord', string>>;
export function defineNavbarActions(windowObject?: Window & typeof globalThis): void;
export function isNavbarPathCurrent(currentPathname: string, linkPathname: string, prefix?: boolean): boolean;
