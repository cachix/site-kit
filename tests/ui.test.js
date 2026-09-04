import assert from "node:assert/strict";
import test from "node:test";

import { defineNavbarActions, isNavbarPathCurrent, navbarIcons } from "../src/ui/navbar-actions.js";
import { uiClassNames } from "../src/ui/index.js";
import {
  createThemeInitializationScript,
  defineThemeToggle,
  isTheme,
  nextTheme,
  resolveTheme,
  themeChangeEvent,
} from "../src/ui/theme.js";

test("matches exact and section navbar paths", () => {
  assert.equal(isNavbarPathCurrent("/docs/", "/docs"), true);
  assert.equal(isNavbarPathCurrent("/docs/setup/", "/docs", true), true);
  assert.equal(isNavbarPathCurrent("/docs-old", "/docs", true), false);
  assert.equal(isNavbarPathCurrent("/blog/post", "/blog"), false);
  assert.equal(isNavbarPathCurrent("/", "/"), true);
});

test("provides the shared RSS icon", () => {
  assert.match(navbarIcons.rss, /<svg/);
});

test("exports the shared text link class", () => {
  assert.equal(uiClassNames.textLink, "csk-text-link");
});

test("exports the shared latest post region class", () => {
  assert.equal(uiClassNames.latestPostRegion, "csk-latest-post-region");
});

test("exports the shared landing hero class", () => {
  assert.equal(uiClassNames.landingHero, "csk-landing-hero");
});

test("opens and closes the shared navbar menu", () => {
  let elementClass;
  let element;
  let buttonClick;
  let firstLinkFocused = false;
  const buttonAttributes = new Map();
  const elementAttributes = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const bodyAttributes = new Map();
  const menuButton = {
    addEventListener(name, listener) {
      if (name === "click") buttonClick = listener;
    },
    focus() {},
    removeEventListener() {},
    setAttribute(name, value) {
      buttonAttributes.set(name, value);
    },
  };
  const menuPanel = {
    querySelector() {
      return { focus() { firstLinkFocused = true; } };
    },
  };
  class HTMLElement {
    dataset = {};
    style = { setProperty() {} };
    addEventListener() {}
    closest() {
      return { getBoundingClientRect: () => ({ bottom: 56 }) };
    }
    contains(target) {
      return target === menuButton || target === menuPanel;
    }
    hasAttribute(name) {
      return elementAttributes.has(name);
    }
    querySelector(selector) {
      if (selector === "[data-csk-navbar-menu-button]") return menuButton;
      if (selector === "[data-csk-navbar-menu-panel]") return menuPanel;
    }
    querySelectorAll() {
      return [];
    }
    removeEventListener() {}
    toggleAttribute(name, force) {
      if (force) elementAttributes.set(name, "");
      else elementAttributes.delete(name);
    }
  }
  const document = {
    addEventListener(name, listener) {
      documentListeners.set(name, listener);
    },
    body: {
      toggleAttribute(name, force) {
        if (force) bodyAttributes.set(name, "");
        else bodyAttributes.delete(name);
      },
    },
    querySelector() {
      return element?.hasAttribute("data-menu-open") ? element : null;
    },
    querySelectorAll() {
      return element?.hasAttribute("data-menu-open") ? [element] : [];
    },
    removeEventListener() {},
  };
  const windowObject = {
    HTMLElement,
    URL,
    addEventListener(name, listener) {
      windowListeners.set(name, listener);
    },
    customElements: {
      define(name, value) {
        assert.equal(name, "csk-navbar-actions");
        elementClass = value;
      },
      get() {},
    },
    document,
    location: new URL("https://example.com/"),
    matchMedia() {
      return { addEventListener() {}, removeEventListener() {} };
    },
    removeEventListener() {},
    requestAnimationFrame(callback) {
      callback();
    },
  };

  defineNavbarActions(windowObject);
  element = new elementClass();
  element.connectedCallback();
  buttonClick();
  assert.equal(element.hasAttribute("data-menu-open"), true);
  assert.equal(buttonAttributes.get("aria-expanded"), "true");
  assert.equal(bodyAttributes.has("data-csk-navbar-menu-open"), true);
  assert.equal(firstLinkFocused, true);

  windowListeners.get("keydown")({ key: "Escape" });
  assert.equal(element.hasAttribute("data-menu-open"), false);
  assert.equal(buttonAttributes.get("aria-expanded"), "false");
  assert.equal(bodyAttributes.has("data-csk-navbar-menu-open"), false);

  buttonClick();
  documentListeners.get("pointerdown")({ target: {} });
  assert.equal(element.hasAttribute("data-menu-open"), false);
});

test("resolves and toggles shared themes", () => {
  assert.equal(isTheme("light"), true);
  assert.equal(isTheme("system"), false);
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(nextTheme("dark"), "light");
  assert.equal(nextTheme("light"), "dark");
});

test("builds a safe early theme initialization script", () => {
  const script = createThemeInitializationScript({
    storageKey: 'theme"key',
    lightColor: "#ffffff",
    darkColor: "#000000",
  });

  assert.match(script, /theme\\"key/);
  assert.match(script, /#ffffff/);
  assert.match(script, /#000000/);
  assert.match(script, /prefers-color-scheme: dark/);
});

test("keeps shared theme toggles synchronized", () => {
  let elementClass;
  let click;
  const attributes = new Map();
  const storage = new Map();
  const listeners = new Map();
  const events = [];
  const button = {
    addEventListener(name, listener) {
      if (name === "click") click = listener;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
  class HTMLElement {
    dataset = {};
    querySelector() {
      return button;
    }
  }
  const windowObject = {
    HTMLElement,
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    StarlightThemeProvider: { updatePickers() {} },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    customElements: {
      define(name, value) {
        assert.equal(name, "csk-theme-toggle");
        elementClass = value;
      },
      get() {},
    },
    dispatchEvent(event) {
      events.push(event);
      listeners.get(event.type)?.(event);
    },
    document: { documentElement: { dataset: { theme: "light" } } },
    localStorage: {
      getItem(key) {
        return storage.get(key);
      },
      setItem(key, value) {
        storage.set(key, value);
      },
    },
    matchMedia() {
      return { matches: false };
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
  };

  defineThemeToggle(windowObject);
  const element = new elementClass();
  element.connectedCallback();
  assert.equal(attributes.get("aria-pressed"), "false");

  click();
  assert.equal(windowObject.document.documentElement.dataset.theme, "dark");
  assert.equal(storage.get("starlight-theme"), "dark");
  assert.equal(attributes.get("aria-pressed"), "true");
  assert.equal(events.at(-1).type, themeChangeEvent);
  assert.deepEqual(events.at(-1).detail, { theme: "dark" });

  element.disconnectedCallback();
  assert.equal(listeners.has(themeChangeEvent), false);
});
