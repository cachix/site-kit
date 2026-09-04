import { fileURLToPath } from "node:url";
import { terminalCopyPlugin } from "../terminal-copy/index.js";

const heroComponent = fileURLToPath(new URL("./HideLandingHero.astro", import.meta.url));
const footerComponent = fileURLToPath(new URL("./Footer.astro", import.meta.url));
const navbarComponent = fileURLToPath(new URL("./Navbar.astro", import.meta.url));
const themeSelectComponent = fileURLToPath(new URL("./ThemeSelect.astro", import.meta.url));
const docsStyles = fileURLToPath(new URL("./docs.css", import.meta.url));
const uiStyles = fileURLToPath(new URL("../ui/styles.css", import.meta.url));
const terminalCopyStyles = fileURLToPath(new URL("../terminal-copy/styles.css", import.meta.url));

export function siteKitStarlight({
  hideLandingHero = true,
  footer = true,
  navbar = true,
  themeToggle = navbar,
  ui = true,
  terminalCopy = true,
} = {}) {
  return {
    name: "@cachix/site-kit",
    hooks: {
      "config:setup"({ config, updateConfig, addIntegration }) {
        const update = {};
        if (footer && typeof footer === "object") {
          addIntegration?.({
            name: "@cachix/site-kit/footer-config",
            hooks: {
              "astro:config:setup"({ updateConfig: updateAstroConfig }) {
                updateAstroConfig({
                  vite: {
                    define: {
                      "import.meta.env.CSK_FOOTER_CONFIG": JSON.stringify(footer),
                    },
                  },
                });
              },
            },
          });
        }
        if (hideLandingHero && !config.components?.Hero) {
          update.components = { ...config.components, Hero: heroComponent };
        }
        if (footer && !config.components?.Footer) {
          update.components = {
            ...config.components,
            ...update.components,
            Footer: footerComponent,
          };
        }
        if (navbar && !config.components?.SocialIcons) {
          update.components = {
            ...config.components,
            ...update.components,
            SocialIcons: navbarComponent,
          };
        }
        if (themeToggle && !config.components?.ThemeSelect) {
          update.components = {
            ...config.components,
            ...update.components,
            ThemeSelect: themeSelectComponent,
          };
        }

        const existingCss = config.customCss ?? [];
        const sharedCss = [];
        if (ui) sharedCss.push(uiStyles, docsStyles);
        if (terminalCopy) sharedCss.push(terminalCopyStyles);
        const customCss = [
          ...sharedCss,
          ...existingCss.filter((stylesheet) => !sharedCss.includes(stylesheet)),
        ];
        if (customCss.some((stylesheet, index) => stylesheet !== existingCss[index])) {
          update.customCss = customCss;
        }

        if (terminalCopy && config.expressiveCode !== false) {
          const expressiveCode = config.expressiveCode ?? {};
          const plugins = [...(expressiveCode.plugins ?? [])];
          if (!plugins.some((plugin) => plugin?.name === "Cachix terminal copy")) {
            plugins.push(terminalCopyPlugin());
            update.expressiveCode = { ...expressiveCode, plugins };
          }
        }

        if (Object.keys(update).length) updateConfig(update);
      },
    },
  };
}
