import assert from "node:assert/strict";
import test from "node:test";

import { siteKitStarlight } from "../src/starlight/index.js";

test("installs shared Starlight behavior", () => {
  let update;
  siteKitStarlight().hooks["config:setup"]({
    config: { customCss: [], expressiveCode: {} },
    updateConfig: (value) => {
      update = value;
    },
  });

  assert.match(update.components.Hero, /HideLandingHero\.astro$/);
  assert.match(update.components.Footer, /Footer\.astro$/);
  assert.match(update.components.SocialIcons, /Navbar\.astro$/);
  assert.match(update.components.ThemeSelect, /ThemeSelect\.astro$/);
  assert.equal(update.customCss.length, 3);
  assert.match(update.customCss[1], /starlight\/docs\.css$/);
  assert.equal(update.expressiveCode.plugins[0].name, "Cachix terminal copy");
});

test("can disable the shared navbar", () => {
  let update;
  siteKitStarlight({ navbar: false }).hooks["config:setup"]({
    config: { customCss: [], expressiveCode: {} },
    updateConfig: (value) => {
      update = value;
    },
  });

  assert.equal(update.components.SocialIcons, undefined);
  assert.equal(update.components.ThemeSelect, undefined);
});

test("preserves explicit consumer overrides", () => {
  let update;
  siteKitStarlight().hooks["config:setup"]({
    config: {
      components: {
        Footer: "./src/Footer.astro",
        Hero: "./src/Hero.astro",
        SocialIcons: "./src/SocialIcons.astro",
        ThemeSelect: "./src/ThemeSelect.astro",
      },
      customCss: ["./src/custom.css"],
      expressiveCode: { plugins: [{ name: "Cachix terminal copy" }] },
    },
    updateConfig: (value) => {
      update = value;
    },
  });

  assert.equal(update.components, undefined);
  assert.match(update.customCss[0], /ui\/styles\.css$/);
  assert.match(update.customCss[1], /starlight\/docs\.css$/);
  assert.match(update.customCss[2], /terminal-copy\/styles\.css$/);
  assert.deepEqual(update.customCss.slice(3), ["./src/custom.css"]);
  assert.equal(update.expressiveCode, undefined);
});

test("can disable every optional feature", () => {
  let called = false;
  siteKitStarlight({ hideLandingHero: false, footer: false, navbar: false, ui: false, terminalCopy: false })
    .hooks["config:setup"]({
      config: {},
      updateConfig: () => {
        called = true;
      },
    });
  assert.equal(called, false);
});

test("passes footer data through a generated Astro integration", () => {
  let integration;
  siteKitStarlight({ footer: { copyright: "Site Kit" } }).hooks["config:setup"]({
    config: {},
    updateConfig() {},
    addIntegration(value) {
      integration = value;
    },
  });
  let update;
  integration.hooks["astro:config:setup"]({
    updateConfig(value) {
      update = value;
    },
  });
  assert.equal(
    update.vite.define["import.meta.env.CSK_FOOTER_CONFIG"],
    JSON.stringify({ copyright: "Site Kit" }),
  );
});
