import { fileURLToPath } from "node:url";
import { terminalCopyPlugin } from "../terminal-copy/index.js";

const heroComponent = fileURLToPath(new URL("./HideLandingHero.astro", import.meta.url));
const uiStyles = fileURLToPath(new URL("../ui/styles.css", import.meta.url));
const terminalCopyStyles = fileURLToPath(new URL("../terminal-copy/styles.css", import.meta.url));

export function siteKitStarlight({
  hideLandingHero = true,
  ui = true,
  terminalCopy = true,
} = {}) {
  return {
    name: "@cachix/site-kit",
    hooks: {
      "config:setup"({ config, updateConfig }) {
        const update = {};
        if (hideLandingHero && !config.components?.Hero) {
          update.components = { ...config.components, Hero: heroComponent };
        }

        const customCss = [...(config.customCss ?? [])];
        if (ui && !customCss.includes(uiStyles)) customCss.push(uiStyles);
        if (terminalCopy && !customCss.includes(terminalCopyStyles)) {
          customCss.push(terminalCopyStyles);
        }
        if (customCss.length !== (config.customCss ?? []).length) update.customCss = customCss;

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

