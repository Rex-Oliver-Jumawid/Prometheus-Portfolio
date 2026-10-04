import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import {
  handoffProgress,
  registerBookEndpoint,
  bookEndpoints,
  subscribeBookEndpoints,
  type BookView,
} from "./book-handoff";
import { createBookHandoffLayer } from "./create-book-handoff-layer";

const mocks = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock("three", async (original) => ({
  ...(await original<typeof import("three")>()),
  PMREMGenerator: class {
    fromScene() {
      return { texture: null, dispose() {} };
    }
    dispose() {}
  },
  WebGLRenderer: class {
    domElement = document.createElement("canvas");
    shadowMap = {};
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
    dispose() {}
    forceContextLoss() {}
    render = mocks.render;
  },
}));
afterEach(() => {
  vi.restoreAllMocks();
  mocks.render.mockReset();
});

it("holds the source book through the room pan and table arrival", () => {
  const work = 900;
  const library = 2700;
  const viewport = 900;
  const delayedStart = work + viewport * 0.65;
  const finish = library + viewport * 0.08;

  expect(handoffProgress(0, work, library, viewport)).toBe(0);
  expect(handoffProgress(work, work, library, viewport)).toBe(0);
  expect(handoffProgress(delayedStart, work, library, viewport)).toBe(0);
  expect(
    handoffProgress(delayedStart + 1, work, library, viewport),
  ).toBeGreaterThan(0);
  expect(handoffProgress(finish, work, library, viewport)).toBe(1);

  const down = [2600, 2900, 3200, 3500].map((y) =>
    handoffProgress(y, work, library, viewport),
  );
  expect([...down].sort()).toEqual(down);
  expect(
    [3500, 3200, 2900, 2600].map((y) =>
      handoffProgress(y, work, library, viewport),
    ),
  ).toEqual(down.reverse());
});

it("notifies for late endpoints and never unregisters their replacements", () => {
  const notify = vi.fn(),
    stop = subscribeBookEndpoints(notify);
  const first = { view: vi.fn(), own: vi.fn() },
    second = { view: vi.fn(), own: vi.fn() };
  const removeFirst = registerBookEndpoint("target", first);
  const removeSecond = registerBookEndpoint("target", second);
  removeFirst();
  expect(bookEndpoints().target).toBe(second);
  removeSecond();
  expect(bookEndpoints().target).toBeUndefined();
  expect(notify).toHaveBeenCalledTimes(4);
  stop();
});

it("projects every book corner exactly at both endpoints and restores borrowed resources", () => {
  const geometry = new THREE.BoxGeometry(2, 3, 0.3);
  geometry.translate(0.4, 0.2, -0.1);
  const material = new THREE.MeshStandardMaterial();
  const disposeGeometry = vi.spyOn(geometry, "dispose"),
    disposeMaterial = vi.spyOn(material, "dispose");
  const sourceScene = new THREE.Scene(),
    targetScene = new THREE.Scene();
  const sourceObject = new THREE.Group(),
    targetObject = new THREE.Group();
  sourceObject.add(new THREE.Mesh(geometry, material));
  targetObject.add(new THREE.Mesh(geometry, material));
  sourceObject.position.set(-0.4, 0.03, 0);
  sourceObject.rotation.z = 0.01;
  targetObject.position.set(1.4, 1.2, -2);
  targetObject.rotation.set(0.02, -0.4, 0.05);
  targetObject.scale.setScalar(0.4);
  sourceScene.add(sourceObject);
  targetScene.add(targetObject);
  const aCamera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 60);
  aCamera.position.z = 13;
  const bCamera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 60);
  bCamera.position.set(0.3, 2, 5);
  bCamera.lookAt(0, 1, -2);
  const source: BookView = {
    object: sourceObject,
    scene: sourceScene,
    camera: aCamera,
    rect: { left: 20, top: 0, width: 800, height: 600 },
  };
  const target: BookView = {
    object: targetObject,
    scene: targetScene,
    camera: bCamera,
    rect: { left: 10, top: 60, width: 900, height: 506.25 },
  };
  const host = document.createElement("div"),
    layer = createBookHandoffLayer(host, vi.fn());
  for (const [progress, view] of [
    [0, source],
    [1, target],
  ] as const) {
    view.object.updateWorldMatrix(true, true);
    view.camera.updateMatrixWorld();
    const corners: THREE.Vector3[] = [];
    for (const x of [-0.6, 1.4])
      for (const y of [-1.3, 1.7])
        for (const z of [-0.25, 0.05]) {
          corners.push(new THREE.Vector3(x, y, z));
        }
    const expected = corners.map((corner) => {
      const point = corner
        .clone()
        .applyMatrix4(view.object.matrixWorld)
        .project(view.camera);
      return {
        x: view.rect.left + ((point.x + 1) * view.rect.width) / 2,
        y: view.rect.top + ((1 - point.y) * view.rect.height) / 2,
      };
    });
    mocks.render.mockImplementationOnce(
      (scene: THREE.Scene, camera: THREE.Camera) => {
        scene.updateMatrixWorld(true);
        camera.updateMatrixWorld();
        corners.forEach((corner, i) => {
          const actual = corner
            .clone()
            .applyMatrix4(sourceObject.matrixWorld)
            .project(camera);
          expect(((actual.x + 1) * innerWidth) / 2).toBeCloseTo(
            expected[i].x,
            7,
          );
          expect(((1 - actual.y) * innerHeight) / 2).toBeCloseTo(
            expected[i].y,
            7,
          );
        });
      },
    );
    layer.render(source, target, progress);
    expect(sourceObject.parent).toBe(sourceScene);
    expect(sourceObject.matrixAutoUpdate).toBe(true);
    expect(sourceObject.position.x).toBe(-0.4);
  }
  mocks.render.mockImplementationOnce(() => {
    throw new Error("Lost handoff draw");
  });
  expect(() => layer.render(source, target, 0.5)).toThrow("Lost handoff draw");
  expect(sourceObject.parent).toBe(sourceScene);
  expect(sourceObject.matrixAutoUpdate).toBe(true);
  expect(sourceObject.position.x).toBe(-0.4);
  layer.dispose();
  expect(host.querySelector("canvas")).toBeNull();
  expect(disposeGeometry).not.toHaveBeenCalled();
  expect(disposeMaterial).not.toHaveBeenCalled();
  geometry.dispose();
  material.dispose();
});
