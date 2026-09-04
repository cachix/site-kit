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
  assert.equal(update.customCss.length, 2);
  assert.equal(update.expressiveCode.plugins[0].name, "Cachix terminal copy");
});

test("installs the shared navbar when enabled", () => {
  let update;
  siteKitStarlight({ navbar: true }).hooks["config:setup"]({
    config: { customCss: [], expressiveCode: {} },
    updateConfig: (value) => {
      update = value;
    },
  });

  assert.match(update.components.SocialIcons, /Navbar\.astro$/);
  assert.match(update.components.ThemeSelect, /ThemeSelect\.astro$/);
});

test("preserves explicit consumer overrides", () => {
  let update;
  siteKitStarlight().hooks["config:setup"]({
    config: {
      components: {
        Hero: "./src/Hero.astro",
        SocialIcons: "./src/SocialIcons.astro",
      },
      customCss: ["./src/custom.css"],
      expressiveCode: { plugins: [{ name: "Cachix terminal copy" }] },
    },
    updateConfig: (value) => {
      update = value;
    },
  });

  assert.equal(update.components, undefined);
  assert.deepEqual(update.customCss.slice(0, 1), ["./src/custom.css"]);
  assert.equal(update.expressiveCode, undefined);
});

test("can disable every optional feature", () => {
  let called = false;
  siteKitStarlight({ hideLandingHero: false, navbar: false, ui: false, terminalCopy: false })
    .hooks["config:setup"]({
      config: {},
      updateConfig: () => {
        called = true;
      },
    });
  assert.equal(called, false);
});
