import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";

import { createGalleryScene } from "./create-gallery-scene";
import { bookEndpoints } from "./book-handoff";

const mocks = vi.hoisted(() => ({ parse: vi.fn(), render: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      shadowMap = {};
      capabilities = { getMaxAnisotropy: () => 1 };
      setPixelRatio() {}
      setClearColor() {}
      setSize() {}
      render = mocks.render;
      dispose() {}
      forceContextLoss() {}
    },
    PMREMGenerator: class {
      fromScene() {
        return { texture: new actual.Texture(), dispose() {} };
      }
      dispose() {}
    },
  };
});
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    parseAsync = mocks.parse;
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

it("grows on scroll, follows the reference idle float, and honors pause and reduced motion", async () => {
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 0.2),
    new THREE.MeshStandardMaterial(),
  );
  book.name = "FO_FrontCover";
  mocks.parse.mockResolvedValueOnce({ scene: book, animations: [] });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frame = undefined;
  });
  let now = performance.now();
  const flush = () => {
    const callback = frame;
    frame = undefined;
    now += 1000 / 60;
    callback?.(now);
  };
  const host = document.createElement("div");
  vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
    width: 1440,
    height: 900,
    top: 0,
    left: 0,
  } as DOMRect);
  const onOpen = vi.fn();
  const controller = await createGalleryScene({
    host,
    bookUrl: "/book.glb",
    signal: new AbortController().signal,
    reducedMotion: false,
    onOpen,
    onContextLost: vi.fn(),
  });
  try {
    expect(bookEndpoints().source).toBeUndefined();
    controller.setPaused(true);
    controller.setVisible(false);
    controller.setScrollProgress(1);
    expect(book.parent!.scale.y * 2).toBeCloseTo(4.4);
    controller.setScrollProgress(0);
    controller.setPaused(false);
    controller.setVisible(true);
    flush();
    const pivot = book.parent!;
    const smallScale = pivot.scale.y;
    const smallBounds = controller.getBookBounds()!;
    expect(pivot.scale.y * 2).toBeCloseTo(4.4 * 0.28);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("/book.glb", expect.anything());

    controller.setScrollProgress(0.5);
    flush();
    const middleScale = pivot.scale.y;
    expect(middleScale).toBeGreaterThan(smallScale);
    controller.setScrollProgress(1);
    flush();
    expect(pivot.scale.y * 2).toBeCloseTo(4.4);
    expect(pivot.scale.y).toBeGreaterThan(middleScale);
    const fullBounds = controller.getBookBounds()!;
    const pose = controller.getCoverPose()!;
    const camera = mocks.render.mock.calls.at(-1)![1] as THREE.Camera;
    const expected = new THREE.Vector3(-0.5, 1, 0.1)
      .applyMatrix4(book.matrixWorld)
      .project(camera);
    expect(pose.topLeft.x).toBeCloseTo(((expected.x + 1) * 1440) / 2);
    expect(pose.topLeft.y).toBeCloseTo(((1 - expected.y) * 900) / 2);
    expect(fullBounds.width).toBeGreaterThan(smallBounds.width * 3);
    expect(fullBounds.height).toBeGreaterThan(smallBounds.height * 3);
    expect(fullBounds.left).toBeGreaterThan(0);
    expect(fullBounds.top).toBeGreaterThan(0);

    const turns: number[] = [];
    const heights: number[] = [];
    for (let index = 0; index < 720; index++) {
      flush();
      turns.push(pivot.rotation.y);
      heights.push(pivot.position.y);
      expect(Math.abs(pivot.position.y)).toBeLessThanOrEqual(0.055);
      expect(Math.abs(pivot.rotation.z)).toBeLessThanOrEqual(0.008);
    }
    expect(turns.every((yaw) => yaw === 0)).toBe(true);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.109);
    expect(heights[360]).toBeCloseTo(heights[0], 4);

    controller.setScrollProgress(0.5);
    flush();
    expect(pivot.scale.y).toBeCloseTo(middleScale);
    controller.setPaused(true);
    const frozenPosition = pivot.position.y;
    const frozenRotation = pivot.rotation.clone();
    controller.setScrollProgress(0);
    flush();
    expect(pivot.scale.y).toBeCloseTo(middleScale);
    expect(pivot.position.y).toBe(frozenPosition);
    expect(pivot.rotation.equals(frozenRotation)).toBe(true);
    expect(frame).toBeUndefined();
    controller.setPaused(false);
    flush();
    expect(pivot.scale.y).toBeCloseTo(smallScale);

    controller.setReducedMotion(true);
    flush();
    expect(pivot.scale.y * 2).toBeCloseTo(4.4);
    expect(pivot.position.y).toBe(0);
    expect(frame).toBeUndefined();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // Vertical dragging tilts the book without being mistaken for a click.
    vi.spyOn(THREE.Raycaster.prototype, "intersectObject").mockReturnValue([
      { object: book, distance: 1, point: new THREE.Vector3() },
    ]);
    host.setPointerCapture = vi.fn();
    host.hasPointerCapture = vi.fn().mockReturnValue(true);
    host.releasePointerCapture = vi.fn();
    const pointer = (type: string, clientY: number) =>
      host.dispatchEvent(
        Object.assign(new Event(type), {
          button: 0,
          pointerId: 1,
          clientX: 100,
          clientY,
        }),
      );
    pointer("pointerdown", 100);
    pointer("pointermove", 125);
    pointer("pointerup", 125);
    flush();
    expect(pivot.rotation.z).toBeCloseTo(0.1);
    expect(pivot.rotation.y).toBeCloseTo(0);
    expect(onOpen).not.toHaveBeenCalled();
    controller.tilt(-1);
    flush();

    controller.tilt(1);
    flush();
    expect(pivot.rotation.z).toBeCloseTo(0.1);
    controller.rotate(-1);
    flush();
    expect(pivot.rotation.y).toBeCloseTo(-0.2);

    vi.advanceTimersByTime(1100);
    flush();
    expect(pivot.rotation.y).toBe(0);
    expect(pivot.rotation.z).toBe(0);

    controller.setReducedMotion(false);
    flush();
    expect(frame).toBeDefined();
    controller.setVisible(false);
    expect(frame).toBeUndefined();
    controller.setScrollProgress(1);
    expect(frame).toBeUndefined();
    controller.setVisible(true);
    expect(frame).toBeDefined();
  } finally {
    controller.dispose();
  }
  expect(frame).toBeUndefined();
  expect(controller.getBookBounds()).toBeNull();
  expect(controller.getCoverPose()).toBeNull();
});
