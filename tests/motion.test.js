import assert from "node:assert/strict";
import test from "node:test";

import {
  createAstroMotionLifecycle,
  createMotionLifecycle,
  initializeViewportReveals,
  revealOnIntersection,
} from "../src/motion/index.js";

class Events {
  listeners = new Map();

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  removeEventListener(name, listener) {
    if (this.listeners.get(name) === listener) this.listeners.delete(name);
  }

  dispatch(name) {
    this.listeners.get(name)?.();
  }
}

test("tracks viewport, page visibility, and reduced motion", () => {
  const media = new Events();
  media.matches = false;
  const document = new Events();
  document.visibilityState = "visible";
  let observer;
  const window = {
    matchMedia: () => media,
    IntersectionObserver: class {
      constructor(callback, options) {
        observer = { callback, options, disconnected: false };
      }
      observe(target) {
        observer.target = target;
      }
      disconnect() {
        observer.disconnected = true;
      }
    },
  };
  const changes = [];
  const target = {};
  const lifecycle = createMotionLifecycle({
    target,
    window,
    document,
    threshold: 0.25,
    onChange: (active, state) => changes.push([active, state.reducedMotion]),
  });

  assert.deepEqual(changes, [[false, false]]);
  observer.callback([{ isIntersecting: true }]);
  assert.equal(lifecycle.active, true);
  media.matches = true;
  media.dispatch("change");
  assert.equal(lifecycle.active, false);
  document.visibilityState = "hidden";
  document.dispatch("visibilitychange");
  media.matches = false;
  media.dispatch("change");
  assert.equal(lifecycle.active, false);
  document.visibilityState = "visible";
  document.dispatch("visibilitychange");
  assert.equal(lifecycle.active, true);
  lifecycle.destroy();
  assert.equal(observer.disconnected, true);
  assert.equal(lifecycle.active, false);
  assert.deepEqual(changes.at(-1), [false, false]);
});

test("is inert during server rendering", () => {
  const lifecycle = createMotionLifecycle({ window: undefined, document: undefined });
  assert.equal(lifecycle.active, false);
  lifecycle.destroy();
});

test("destroys Astro motion before document swaps", () => {
  const media = new Events();
  media.matches = false;
  const document = new Events();
  document.visibilityState = "visible";
  let disconnected = false;
  const window = {
    matchMedia: () => media,
    IntersectionObserver: class {
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  };
  const lifecycle = createAstroMotionLifecycle({ target: {}, window, document });

  assert.equal(document.listeners.has("astro:before-swap"), true);
  document.dispatch("astro:before-swap");
  assert.equal(disconnected, true);
  assert.equal(lifecycle.active, false);
  assert.equal(document.listeners.has("astro:before-swap"), false);
});

test("reveals intersecting elements once", () => {
  const first = { classList: new Set() };
  const second = { classList: new Set() };
  let observer;
  const window = {
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: class {
      constructor(callback, options) {
        observer = { callback, options, observed: [], unobserved: [], disconnected: false };
      }
      observe(target) {
        observer.observed.push(target);
      }
      unobserve(target) {
        observer.unobserved.push(target);
      }
      disconnect() {
        observer.disconnected = true;
      }
    },
  };
  const state = revealOnIntersection({
    root: { querySelectorAll: () => [first, second] },
    window,
    threshold: 0.25,
  });

  assert.deepEqual(observer.observed, [first, second]);
  assert.deepEqual(observer.options, { threshold: 0.25, rootMargin: "0px" });
  observer.callback([{ target: first, isIntersecting: true }, { target: second, isIntersecting: false }]);
  assert.equal(first.classList.has("visible"), true);
  assert.equal(second.classList.has("visible"), false);
  assert.deepEqual(observer.unobserved, [first]);
  state.destroy();
  assert.equal(observer.disconnected, true);
});

test("reveals immediately when reduced motion is requested", () => {
  const element = { classList: new Set() };
  revealOnIntersection({
    root: { querySelectorAll: () => [element] },
    window: { matchMedia: () => ({ matches: true }) },
  });
  assert.equal(element.classList.has("visible"), true);
});

test("marks landing content and sections for shared viewport reveals", () => {
  const createElement = ({ matches = () => false, querySelector = () => null } = {}) => ({
    classList: new Set(),
    getAttribute: () => null,
    matches,
    querySelector,
  });
  const heroContent = createElement();
  const latestPost = createElement({ matches: (selector) => selector === ".csk-latest-post-region" });
  const section = createElement({ matches: (selector) => selector === "section" });
  const hero = createElement();
  hero.children = [latestPost, heroContent];
  hero.parentElement = { children: [hero, section] };
  const root = {
    querySelector: () => hero,
    querySelectorAll: () => [heroContent, section],
  };
  let observed;
  const window = {
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: class {
      constructor() {
        observed = [];
      }
      observe(element) {
        observed.push(element);
      }
      disconnect() {}
    },
  };

  initializeViewportReveals({ root, window, document: root });

  assert.equal(heroContent.classList.has("csk-reveal"), true);
  assert.equal(section.classList.has("csk-reveal"), true);
  assert.equal(latestPost.classList.has("csk-reveal"), false);
  assert.deepEqual(observed, [heroContent, section]);
});
