export type Theme = "light" | "dark";

export interface ThemeInitializationOptions {
  storageKey?: string;
  lightColor?: string;
  darkColor?: string;
}

export const themeChangeEvent: "csk:theme-change";
export const themeStorageKey: "starlight-theme";
export function isTheme(value: unknown): value is Theme;
export function resolveTheme(storedTheme: unknown, prefersDark?: boolean): Theme;
export function nextTheme(theme: unknown): Theme;
export function initializeTheme(options?: ThemeInitializationOptions): void;
export function createThemeInitializationScript(options?: ThemeInitializationOptions): string;
export function defineThemeToggle(windowObject?: Window): void;
