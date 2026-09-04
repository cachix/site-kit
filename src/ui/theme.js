export const themeChangeEvent = "csk:theme-change";
export const themeStorageKey = "starlight-theme";

export function isTheme(value) {
  return value === "light" || value === "dark";
}

export function resolveTheme(storedTheme, prefersDark = false) {
  return isTheme(storedTheme) ? storedTheme : prefersDark ? "dark" : "light";
}

export function nextTheme(theme) {
  return theme === "dark" ? "light" : "dark";
}

function initializeThemeDocument({
  storageKey,
  lightColor,
  darkColor,
} = {}) {
  const root = document.documentElement;
  const colors = { light: lightColor, dark: darkColor };
  const applyColor = (theme) => {
    const color = colors[theme];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (color && meta) meta.setAttribute("content", color);
  };
  let storedTheme;
  try {
    storedTheme = localStorage.getItem(storageKey);
  } catch {}
  const theme = storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.dataset.theme = theme;
  applyColor(theme);
  addEventListener("csk:theme-change", (event) => applyColor(event.detail?.theme));
}

export function initializeTheme(options) {
  initializeThemeDocument({ ...options, storageKey: options?.storageKey ?? themeStorageKey });
}

export function createThemeInitializationScript(options = {}) {
  const settings = { ...options, storageKey: options.storageKey ?? themeStorageKey };
  return `(${initializeThemeDocument.toString()})(${JSON.stringify(settings)});`;
}

export function defineThemeToggle(windowObject = globalThis.window) {
  if (!windowObject?.customElements || !windowObject.HTMLElement) return;
  if (windowObject.customElements.get("csk-theme-toggle")) return;

  class CachixThemeToggle extends windowObject.HTMLElement {
    connectedCallback() {
      if (this.dataset.connected !== undefined) {
        this.updateThemeState?.();
        if (this.updateThemeState) windowObject.addEventListener(themeChangeEvent, this.updateThemeState);
        return;
      }
      this.dataset.connected = "";

      const root = windowObject.document.documentElement;
      const storageKey = this.dataset.storageKey ?? themeStorageKey;
      const button = this.querySelector("button");
      let storedTheme;
      try {
        storedTheme = windowObject.localStorage.getItem(storageKey);
      } catch {}
      if (!isTheme(root.dataset.theme)) {
        root.dataset.theme = resolveTheme(
          storedTheme,
          windowObject.matchMedia("(prefers-color-scheme: dark)").matches,
        );
      }

      const update = () => {
        button?.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
      };
      this.updateThemeState = update;
      update();
      windowObject.addEventListener(themeChangeEvent, update);

      button?.addEventListener("click", () => {
        const theme = nextTheme(root.dataset.theme);
        root.dataset.theme = theme;
        try {
          windowObject.localStorage.setItem(storageKey, theme);
        } catch {}
        windowObject.StarlightThemeProvider?.updatePickers(theme);
        windowObject.dispatchEvent(new windowObject.CustomEvent(themeChangeEvent, { detail: { theme } }));
        update();
      });

    }

    disconnectedCallback() {
      if (this.updateThemeState) windowObject.removeEventListener(themeChangeEvent, this.updateThemeState);
    }
  }

  windowObject.customElements.define("csk-theme-toggle", CachixThemeToggle);
}
