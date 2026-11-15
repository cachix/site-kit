import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { terminalCopyPlugin } from "../terminal-copy/index.js";

const headComponent = fileURLToPath(new URL("./Head.astro", import.meta.url));
const heroComponent = fileURLToPath(new URL("./HideLandingHero.astro", import.meta.url));
const footerComponent = fileURLToPath(new URL("./Footer.astro", import.meta.url));
const navbarComponent = fileURLToPath(new URL("./Navbar.astro", import.meta.url));
const themeSelectComponent = fileURLToPath(new URL("./ThemeSelect.astro", import.meta.url));
const docsStyles = fileURLToPath(new URL("./docs.css", import.meta.url));
const uiStyles = fileURLToPath(new URL("../ui/styles.css", import.meta.url));
const terminalCopyStyles = fileURLToPath(new URL("../terminal-copy/styles.css", import.meta.url));
const headModule = "virtual:cachix-site-kit/starlight-head";

function clientRouterIntegration(head) {
  return {
    name: "@cachix/site-kit/client-router",
    hooks: {
      "astro:config:setup"({ config, updateConfig }) {
        const inlineLimit = config.vite?.build?.assetsInlineLimit;
        updateConfig({
          vite: {
            build: {
              assetsInlineLimit(filePath, content) {
                if (filePath.endsWith(".js")) return false;
                if (typeof inlineLimit === "function") return inlineLimit(filePath, content);
                if (typeof inlineLimit === "number") return content.length < inlineLimit;
              },
            },
            plugins: [{
              name: "@cachix/site-kit/starlight-head",
              resolveId: (id) => id === headModule ? `\0${headModule}` : undefined,
              load: (id) => id === `\0${headModule}` ? `export { default } from ${JSON.stringify(head)};` : undefined,
            }],
          },
        });
      },
    },
  };
}

export function siteKitStarlight({
  hideLandingHero = true,
  footer = true,
  navbar = true,
  themeToggle = navbar,
  ui = true,
  terminalCopy = true,
  clientRouter = true,
} = {}) {
  return {
    name: "@cachix/site-kit",
    hooks: {
      "config:setup"({ config, updateConfig, addIntegration, astroConfig }) {
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
        if (clientRouter) {
          try {
            import.meta.resolve("astro-vtbot/package.json");
          } catch {
            throw new Error("siteKitStarlight() navigates with astro-vtbot. Install it or pass clientRouter: false.");
          }
          const head = config.components?.Head ?? "@astrojs/starlight/components/Head.astro";
          addIntegration?.(clientRouterIntegration(
            head.startsWith(".") ? resolve(fileURLToPath(astroConfig.root), head) : head,
          ));
          update.components = {
            ...config.components,
            ...update.components,
            Head: headComponent,
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
