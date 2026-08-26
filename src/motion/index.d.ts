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

