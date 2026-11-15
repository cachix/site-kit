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
  assert.match(update.components.Head, /starlight\/Head\.astro$/);
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
  siteKitStarlight({ clientRouter: false }).hooks["config:setup"]({
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

test("routes pages on the client around the consumer Head", () => {
  let update;
  let integration;
  siteKitStarlight().hooks["config:setup"]({
    astroConfig: { root: new URL("file:///project/") },
    config: { components: { Head: "./src/Head.astro" } },
    updateConfig: (value) => {
      update = value;
    },
    addIntegration(value) {
      integration = value;
    },
  });

  assert.match(update.components.Head, /starlight\/Head\.astro$/);
  let astroUpdate;
  integration.hooks["astro:config:setup"]({
    config: { vite: { build: { assetsInlineLimit: 100 } } },
    updateConfig(value) {
      astroUpdate = value;
    },
  });
  const { build, plugins: [plugin] } = astroUpdate.vite;
  assert.equal(build.assetsInlineLimit("chunk.js", Buffer.alloc(1)), false);
  assert.equal(build.assetsInlineLimit("icon.svg", Buffer.alloc(99)), true);
  assert.equal(build.assetsInlineLimit("icon.svg", Buffer.alloc(100)), false);
  const id = plugin.resolveId("virtual:cachix-site-kit/starlight-head");
  assert.equal(plugin.load(id), 'export { default } from "/project/src/Head.astro";');
  assert.equal(plugin.resolveId("./other.js"), undefined);
});

test("wraps the default Starlight Head", () => {
  let integration;
  siteKitStarlight().hooks["config:setup"]({
    config: {},
    updateConfig() {},
    addIntegration(value) {
      integration = value;
    },
  });
  let astroUpdate;
  integration.hooks["astro:config:setup"]({
    config: {},
    updateConfig(value) {
      astroUpdate = value;
    },
  });
  const { build, plugins: [plugin] } = astroUpdate.vite;
  assert.equal(build.assetsInlineLimit("icon.svg", Buffer.alloc(1)), undefined);
  assert.equal(
    plugin.load(plugin.resolveId("virtual:cachix-site-kit/starlight-head")),
    'export { default } from "@astrojs/starlight/components/Head.astro";',
  );
});

test("can disable every optional feature", () => {
  let called = false;
  siteKitStarlight({ hideLandingHero: false, footer: false, navbar: false, ui: false, terminalCopy: false, clientRouter: false })
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
  siteKitStarlight({ footer: { copyright: "Site Kit" }, clientRouter: false }).hooks["config:setup"]({
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
