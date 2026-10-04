import { afterEach, expect, it, vi } from "vitest";
import { scheduleIdlePreparation } from "./schedule-idle-preparation";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("waits for hero-critical load and a paint before scheduling cancellable idle work", () => {
  vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
  let paint!: FrameRequestCallback;
  let idle!: IdleRequestCallback;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    paint = cb;
    return 1;
  });
  const request = vi.fn((cb: IdleRequestCallback) => {
    idle = cb;
    return 2;
  });
  const cancel = vi.fn();
  vi.stubGlobal("requestIdleCallback", request);
  vi.stubGlobal("cancelIdleCallback", cancel);
  const work = vi.fn();
  const stop = scheduleIdlePreparation(work);
  expect(request).not.toHaveBeenCalled();
  window.dispatchEvent(new Event("load"));
  expect(request).not.toHaveBeenCalled();
  paint(0);
  expect(request).toHaveBeenCalledWith(expect.any(Function), { timeout: 1500 });
  expect(work).not.toHaveBeenCalled();
  stop();
  idle({ didTimeout: false, timeRemaining: () => 10 });
  expect(work).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledWith(2);
});

it("uses a cancellable timer in browsers without idle callbacks", () => {
  vi.useFakeTimers();
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("requestIdleCallback", undefined);
  const work = vi.fn();
  const stop = scheduleIdlePreparation(work);
  expect(work).not.toHaveBeenCalled();
  vi.advanceTimersByTime(200);
  expect(work).toHaveBeenCalledOnce();
  stop();
  const cancel = scheduleIdlePreparation(work);
  cancel();
  vi.advanceTimersByTime(200);
  expect(work).toHaveBeenCalledOnce();
});
