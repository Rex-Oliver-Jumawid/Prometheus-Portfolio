import type * as THREE from "three";

export type BookView = {
  object: THREE.Object3D;
  scene: THREE.Scene;
  camera: THREE.Camera;
  rect: { left: number; top: number; width: number; height: number };
};

export type BookEndpoint = {
  view: () => BookView;
  own: (owned: boolean, arrival?: number) => void;
};

// A route-local rendezvous for asynchronously loaded scenes. No scroll state is
// stored here: the coordinator alone chooses and commits ownership each frame.
const endpoints: Partial<Record<"source" | "target", BookEndpoint>> = {};
const listeners = new Set<() => void>();
export function registerBookEndpoint(
  role: "source" | "target",
  endpoint: BookEndpoint,
) {
  endpoints[role] = endpoint;
  listeners.forEach((notify) => notify());
  return () => {
    if (endpoints[role] === endpoint) delete endpoints[role];
    listeners.forEach((notify) => notify());
  };
}
export function bookEndpoints() {
  return endpoints;
}
export function subscribeBookEndpoints(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export const HANDOFF = {
  // The 2nd viewport now spends one scroll beat on the roof/room pan and a
  // second beat bringing the book onto the table. Start the shelf transfer
  // only near the end of that second beat so the book remains interactive.
  startDelay: 1.8,
  finish: 0.08,
  arc: 0.12,
  recoverySeconds: 0.65,
  shadowStart: 0.7,
} as const;

export function handoffProgress(
  scroll: number,
  work: number,
  library: number,
  viewportHeight: number,
) {
  // Keep the source book in the 2nd viewport through the roof pan and book
  // arrival. Only near the end of the section do we begin moving it to the
  // shelf. Both ends are document-flow positions, never sticky rects.
  const start = work + viewportHeight * HANDOFF.startDelay;
  const end = library + viewportHeight * HANDOFF.finish;
  const linear = Math.min(
    1,
    Math.max(0, (scroll - start) / Math.max(1, end - start)),
  );
  return linear * linear * (3 - 2 * linear);
}
