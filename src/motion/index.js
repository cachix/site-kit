export function createMotionLifecycle({
  target,
  onChange = () => {},
  threshold = 0,
  rootMargin = "0px",
  window: windowObject = globalThis.window,
  document: documentObject = globalThis.document,
} = {}) {
  if (!windowObject || !documentObject) {
    return {
      active: false,
      reducedMotion: false,
      destroy() {},
    };
  }

  const media = windowObject.matchMedia("(prefers-reduced-motion: reduce)");
  let pageVisible = documentObject.visibilityState !== "hidden";
  let intersecting = !target || !("IntersectionObserver" in windowObject);
  let destroyed = false;
  let lastActive;

  const state = {
    get active() {
      return !destroyed && pageVisible && intersecting && !media.matches;
    },
    get reducedMotion() {
      return media.matches;
    },
    destroy,
  };

  const emit = () => {
    const active = state.active;
    if (active === lastActive) return;
    lastActive = active;
    onChange(active, { reducedMotion: media.matches });
  };

  const onVisibilityChange = () => {
    pageVisible = documentObject.visibilityState !== "hidden";
    emit();
  };
  const onMotionChange = () => emit();

  documentObject.addEventListener("visibilitychange", onVisibilityChange);
  media.addEventListener("change", onMotionChange);

  const observer = target && "IntersectionObserver" in windowObject
    ? new windowObject.IntersectionObserver(
        ([entry]) => {
          intersecting = entry?.isIntersecting ?? false;
          emit();
        },
        { threshold, rootMargin },
      )
    : undefined;

  observer?.observe(target);
  emit();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    documentObject.removeEventListener("visibilitychange", onVisibilityChange);
    media.removeEventListener("change", onMotionChange);
    if (lastActive !== false) {
      lastActive = false;
      onChange(false, { reducedMotion: media.matches });
    }
  }

  return state;
}

export function createAstroMotionLifecycle(options = {}) {
  const documentObject = options.document ?? globalThis.document;
  const lifecycle = createMotionLifecycle(options);
  if (!documentObject?.addEventListener) return lifecycle;

  let destroyed = false;
  const onBeforeSwap = () => destroy();
  documentObject.addEventListener("astro:before-swap", onBeforeSwap, { once: true });

  return {
    get active() {
      return lifecycle.active;
    },
    get reducedMotion() {
      return lifecycle.reducedMotion;
    },
    destroy,
  };

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    documentObject.removeEventListener("astro:before-swap", onBeforeSwap);
    lifecycle.destroy();
  }
}

export function revealOnIntersection({
  root,
  selector = ".reveal",
  visibleClass = "visible",
  threshold = 0,
  rootMargin = "0px",
  window: windowObject = globalThis.window,
  document: documentObject = globalThis.document,
} = {}) {
  const scope = root ?? documentObject;
  if (!scope?.querySelectorAll) return { destroy() {} };

  const elements = [...scope.querySelectorAll(selector)];
  const reveal = (element) => element.classList.add(visibleClass);
  if (!windowObject || !("IntersectionObserver" in windowObject)
    || windowObject.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach(reveal);
    return { destroy() {} };
  }

  const observer = new windowObject.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }
  }, { threshold, rootMargin });

  elements.forEach((element) => observer.observe(element));
  return {
    destroy() {
      observer.disconnect();
    },
  };
}

export function initializeViewportReveals({
  root,
  automatic = true,
  threshold = 0.12,
  rootMargin = "0px 0px -6% 0px",
  window: windowObject = globalThis.window,
  document: documentObject = globalThis.document,
} = {}) {
  const scope = root ?? documentObject;
  const selector = ".csk-reveal";

  if (automatic && scope?.querySelector) {
    const hero = scope.querySelector(".csk-landing-hero");
    if (hero) {
      const candidates = [...(hero.children ?? [])];
      for (const sibling of hero.parentElement?.children ?? []) {
        if (sibling !== hero && sibling.matches?.("section")) candidates.push(sibling);
      }

      for (const element of candidates) {
        if (element.matches?.(".csk-latest-post-region")
          || element.getAttribute?.("aria-hidden") === "true"
          || element.matches?.(selector)
          || element.querySelector?.(selector)) continue;
        element.classList?.add("csk-reveal");
      }
    }
  }

  return revealOnIntersection({
    root: scope,
    selector,
    visibleClass: "csk-reveal--visible",
    threshold,
    rootMargin,
    window: windowObject,
    document: documentObject,
  });
}
