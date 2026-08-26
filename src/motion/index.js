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
  }

  return state;
}

