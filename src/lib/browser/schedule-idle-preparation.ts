/** Leave hero images and first paint ahead of optional WebGL preparation. */
export function scheduleIdlePreparation(prepare: () => void) {
  let cancelled = false;
  let frame = 0;
  let idle: number | undefined;
  let timer: number | undefined;
  const run = () => {
    if (!cancelled) prepare();
  };
  const schedule = () => {
    frame = window.requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(run, { timeout: 1500 });
      } else {
        timer = window.setTimeout(run, 200);
      }
    });
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    window.cancelAnimationFrame(frame);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
