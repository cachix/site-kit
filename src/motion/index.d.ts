export interface MotionLifecycleState {
  readonly active: boolean;
  readonly reducedMotion: boolean;
  destroy(): void;
}

export interface MotionLifecycleOptions {
  target?: Element;
  onChange?: (active: boolean, state: { reducedMotion: boolean }) => void;
  threshold?: number | number[];
  rootMargin?: string;
  window?: Window;
  document?: Document;
}

export function createMotionLifecycle(options?: MotionLifecycleOptions): MotionLifecycleState;
export function createAstroMotionLifecycle(options?: MotionLifecycleOptions): MotionLifecycleState;

export interface RevealOnIntersectionOptions {
  root?: ParentNode;
  selector?: string;
  visibleClass?: string;
  threshold?: number | number[];
  rootMargin?: string;
  window?: Window;
  document?: Document;
}

export interface RevealOnIntersectionState {
  destroy(): void;
}

export function revealOnIntersection(options?: RevealOnIntersectionOptions): RevealOnIntersectionState;
