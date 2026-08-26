import assert from "node:assert/strict";
import test from "node:test";

import { createMotionLifecycle } from "../src/motion/index.js";

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
});

test("is inert during server rendering", () => {
  const lifecycle = createMotionLifecycle({ window: undefined, document: undefined });
  assert.equal(lifecycle.active, false);
  lifecycle.destroy();
});

