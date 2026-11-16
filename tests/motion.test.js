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

function landingPage() {
  const createElement = ({ matches = () => false } = {}) => ({
    classList: new Set(),
    getAttribute: () => null,
    matches,
    querySelector: () => null,
  });
  const section = () => createElement({ matches: (selector) => selector === "section" });
  const heroContent = createElement();
  const latestPost = createElement({ matches: (selector) => selector === ".csk-latest-post-region" });
  const scrolledPast = section();
  const onScreen = section();
  const belowFold = section();
  const hero = createElement();
  hero.children = [latestPost, heroContent];
  hero.parentElement = { children: [scrolledPast, hero, onScreen, belowFold] };
  const root = {
    querySelector: (selector) => selector === ".csk-landing-hero" ? hero : null,
    querySelectorAll: () => [],
  };
  const observers = [];
  const window = {
    innerHeight: 800,
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: class {
      observed = [];
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        observers.push(this);
      }
      observe(element) {
        this.observed.push(element);
      }
      unobserve(element) {
        this.observed = this.observed.filter((observed) => observed !== element);
      }
      disconnect() {
        this.observed = [];
      }
    },
  };
  return { root, window, observers, heroContent, latestPost, scrolledPast, onScreen, belowFold };
}

test("leaves landing content alone until the first viewport report", () => {
  const page = landingPage();
  initializeViewportReveals({ root: page.root, window: page.window, document: page.root });

  const observer = page.observers.at(-1);
  assert.deepEqual(observer.observed, [page.heroContent, page.scrolledPast, page.onScreen, page.belowFold]);
  assert.equal(page.latestPost.classList.size, 0);
  for (const element of observer.observed) assert.equal(element.classList.size, 0);
});

test("hides only landing content that the first report places below the viewport", () => {
  const page = landingPage();
  const reveals = initializeViewportReveals({ root: page.root, window: page.window, document: page.root });
  const observer = page.observers.at(-1);
  const entry = (target, top, isIntersecting = false) => ({ target, isIntersecting, boundingClientRect: { top } });

  observer.callback([
    entry(page.heroContent, 120, true),
    entry(page.scrolledPast, -400),
    entry(page.onScreen, 500, true),
    entry(page.belowFold, 900),
  ]);
  for (const element of [page.heroContent, page.scrolledPast, page.onScreen]) {
    assert.equal(element.classList.size, 0);
  }
  assert.deepEqual([...page.belowFold.classList], ["csk-reveal"]);
  assert.deepEqual(observer.observed, [page.belowFold]);

  observer.callback([entry(page.belowFold, 600, true)]);
  assert.deepEqual([...page.belowFold.classList], ["csk-reveal", "csk-reveal--visible"]);
  assert.deepEqual(observer.observed, []);
  reveals.destroy();
});

test("leaves landing content visible without motion", () => {
  const page = landingPage();
  page.window.matchMedia = () => ({ matches: true });
  initializeViewportReveals({ root: page.root, window: page.window, document: page.root });
  assert.equal(page.observers.length, 0);
});

test("measures landing content again when the first report arrives late", () => {
  const page = landingPage();
  page.belowFold.getBoundingClientRect = () => ({ top: 300 });
  initializeViewportReveals({ root: page.root, window: page.window, document: page.root });
  const observer = page.observers.at(-1);

  observer.callback([{ target: page.belowFold, isIntersecting: false, boundingClientRect: { top: 900 } }]);
  assert.equal(page.belowFold.classList.size, 0);
  assert.equal(observer.observed.includes(page.belowFold), false);
});
