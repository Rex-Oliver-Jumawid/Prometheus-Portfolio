import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { registerBookEndpoint } from "./book-handoff";

type GalleryOptions = {
  host: HTMLElement;
  bookUrl: string;
  signal: AbortSignal;
  reducedMotion: boolean;
  onOpen: () => void;
  onContextLost: () => void;
};

export type GalleryScene = {
  getCoverPose: () => {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  } | null;
  getBookBounds: () => {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  setVisible: (visible: boolean) => void;
  setPaused: (paused: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setScrollProgress: (progress: number) => void;
  rotate: (direction: number) => void;
  tilt: (direction: number) => void;
  dispose: () => void;
};

/** Every resource belongs to this scene; the GLTF is not shared or cached. */
function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const owned = Array.isArray(object.material)
      ? object.material
      : [object.material];
    owned.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (!(value instanceof THREE.Texture)) return;
        textures.add(value);
        if (
          typeof ImageBitmap !== "undefined" &&
          value.image instanceof ImageBitmap
        )
          bitmaps.add(value.image);
      });
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  bitmaps.forEach((bitmap) => bitmap.close());
}

export async function createGalleryScene(
  options: GalleryOptions,
): Promise<GalleryScene> {
  const { host, signal } = options;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 2 ** 0.14;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const loader = new GLTFLoader();
  async function load(url: string) {
    const response = await fetch(url, { signal, cache: "force-cache" });
    if (!response.ok)
      throw new Error(`Could not load gallery asset (${response.status}).`);
    const model = await loader.parseAsync(
      await response.arrayBuffer(),
      new URL(".", new URL(url, location.href)).href,
    );
    if (signal.aborted) {
      disposeModel(model.scene);
      throw new DOMException("Gallery loading cancelled", "AbortError");
    }
    return model;
  }

  let book: THREE.Group;
  try {
    book = (await load(options.bookUrl)).scene;
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 60);
  camera.position.set(0, 0, 13);
  camera.lookAt(0, 0, 0);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.25;
  scene.add(new THREE.HemisphereLight(0xf1e8db, 0x544553, 0.3));
  const key = new THREE.DirectionalLight(0xffefd8, 3.25);
  key.position.set(-4, 5, 5.5);
  const fill = new THREE.DirectionalLight(0xd6ddec, 0.42);
  fill.position.set(5, 3, 4);
  const rim = new THREE.DirectionalLight(0xffdca8, 1.35);
  rim.position.set(3, 7, -4);
  scene.add(key, key.target, fill, rim);
  book.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.aoMapIntensity = 0.78;
      if (material.map)
        material.map.anisotropy = Math.min(
          8,
          renderer.capabilities.getMaxAnisotropy(),
        );
    });
  });
  // Geometry is presentation only: book identity and URLs are supplied by TypeScript content.
  const bookBounds = new THREE.Box3().setFromObject(book);
  book.position.sub(bookBounds.getCenter(new THREE.Vector3()));
  const bookSize = bookBounds.getSize(new THREE.Vector3());
  const bookPivot = new THREE.Group();
  bookPivot.add(book);
  const bookScale = 4.4 / Math.max(bookSize.x, bookSize.y, bookSize.z);
  bookPivot.scale.setScalar(bookScale * (options.reducedMotion ? 1 : 0.28));
  bookPivot.rotation.set(0, 0, 0);
  scene.add(bookPivot);

  let reduced = options.reducedMotion;
  let paused = false;
  let visible = false;
  let disposed = false;
  let scrollProgress = 0;
  let progress = reduced ? 1 : 0;
  let phase = 0;
  let targetYaw = 0;
  let targetRoll = 0;
  let idleTimer: number | undefined;
  let frame = 0;
  let hasRendered = false;
  let handoffOwned = false;
  let last = performance.now();

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const viewHeight = Math.max(5.5, 3.5 / aspect);
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    requestRender();
  }
  function requestRender() {
    if (disposed || !visible || frame) return;
    last = performance.now();
    frame = requestAnimationFrame(render);
  }
  function render(now: number) {
    frame = 0;
    if (disposed || !visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (handoffOwned) return;
    if (reduced) progress = 1;
    else if (!paused) progress = scrollProgress;
    const growth = THREE.MathUtils.smoothstep(progress, 0, 1);
    bookPivot.scale.setScalar(
      bookScale * THREE.MathUtils.lerp(0.28, 1, growth),
    );
    if (reduced) {
      bookPivot.position.y = 0;
      bookPivot.rotation.set(0, targetYaw, targetRoll);
    } else if (!paused) {
      phase += dt;
      const t = (phase * Math.PI) / 3;
      const damping = drag ? 16 : 5;
      bookPivot.position.y = Math.sin(t) * 0.055;
      bookPivot.rotation.x = 0;
      bookPivot.rotation.y = THREE.MathUtils.damp(
        bookPivot.rotation.y,
        targetYaw,
        damping,
        dt,
      );
      bookPivot.rotation.z = THREE.MathUtils.damp(
        bookPivot.rotation.z,
        targetRoll + Math.sin(t) * 0.008,
        damping,
        dt,
      );
    }
    renderer.render(scene, camera);
    hasRendered = true;
    if (!reduced && !paused) frame = requestAnimationFrame(render);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drag: {
    id: number;
    x: number;
    y: number;
    yaw: number;
    roll: number;
    moved: boolean;
  } | null = null;
  function returnToIdle() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      targetYaw = 0;
      targetRoll = 0;
      if (paused || reduced) bookPivot.rotation.set(0, 0, 0);
      requestRender();
    }, 1100);
  }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const rect = host.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.intersectObject(bookPivot, true).length) return;
    window.clearTimeout(idleTimer);
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: targetYaw,
      roll: targetRoll,
      moved: false,
    };
    host.setPointerCapture(event.pointerId);
    host.style.cursor = "grabbing";
  }
  function pointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    const verticalDelta = event.clientY - drag.y;
    if (Math.hypot(delta, verticalDelta) > 6) drag.moved = true;
    targetYaw = THREE.MathUtils.clamp(drag.yaw + delta * 0.006, -1.1, 0.8);
    targetRoll = THREE.MathUtils.clamp(
      drag.roll + verticalDelta * 0.004,
      -0.5,
      0.5,
    );
    if (paused || reduced) {
      bookPivot.rotation.y = targetYaw;
      bookPivot.rotation.z = targetRoll;
    }
    requestRender();
  }
  function release(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const open = !drag.moved && event.type === "pointerup";
    drag = null;
    returnToIdle();
    host.style.cursor = "grab";
    if (host.hasPointerCapture(event.pointerId))
      host.releasePointerCapture(event.pointerId);
    if (open) options.onOpen();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    unregister();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
    options.onContextLost();
  }
  // Resolve readiness only after shader compilation, texture upload and a real
  // frame. This also warms the GPU while the homepage hero is still visible.
  try {
    resize();
    await renderer.compileAsync(scene, camera);
    signal.throwIfAborted();
    renderer.render(scene, camera);
  } catch (error) {
    if (frame) cancelAnimationFrame(frame);
    disposeModel(book);
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
  host.append(renderer.domElement);
  host.style.cursor = "grab";
  host.addEventListener("pointerdown", pointerDown);
  host.addEventListener("pointermove", pointerMove);
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);
  host.addEventListener("lostpointercapture", release);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  const unregister = host.closest('#work[data-standalone="true"]')
    ? () => {}
    : registerBookEndpoint("source", {
        view() {
          book.updateWorldMatrix(true, true);
          camera.updateMatrixWorld();
          return {
            object: book,
            scene,
            camera,
            rect: host.getBoundingClientRect(),
          };
        },
        own(owned) {
          const changed = handoffOwned === owned;
          handoffOwned = !owned;
          bookPivot.visible = owned;
          host.dataset.bookVisible = String(owned);
          host.tabIndex = owned ? 0 : -1;
          host.setAttribute("aria-disabled", String(!owned));
          if (changed) {
            renderer.render(scene, camera);
            if (owned) requestRender();
          }
        },
      });

  return {
    getCoverPose() {
      if (disposed) return null;
      const cover = book.getObjectByName("FO_FrontCover");
      const rect = host.getBoundingClientRect();
      if (!cover || !rect.width || !rect.height) return null;
      bookPivot.updateWorldMatrix(true, true);
      camera.updateMatrixWorld();
      const inverseCover = cover.matrixWorld.clone().invert();
      const bounds = new THREE.Box3();
      cover.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.computeBoundingBox();
        if (!object.geometry.boundingBox) return;
        bounds.union(
          object.geometry.boundingBox
            .clone()
            .applyMatrix4(inverseCover.clone().multiply(object.matrixWorld)),
        );
      });
      if (bounds.isEmpty()) return null;
      const project = (x: number, y: number) => {
        const point = new THREE.Vector3(x, y, bounds.max.z)
          .applyMatrix4(cover.matrixWorld)
          .project(camera);
        return {
          x: rect.left + ((point.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - point.y) * rect.height) / 2,
        };
      };
      return {
        topLeft: project(bounds.min.x, bounds.max.y),
        topRight: project(bounds.max.x, bounds.max.y),
        bottomLeft: project(bounds.min.x, bounds.min.y),
      };
    },
    getBookBounds() {
      if (disposed) return null;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      bookPivot.updateWorldMatrix(true, true);
      camera.updateMatrixWorld();
      const bounds = new THREE.Box3().setFromObject(bookPivot);
      const projected = new THREE.Box2();
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new THREE.Vector3(x, y, z).project(camera);
            projected.expandByPoint(
              new THREE.Vector2(
                rect.left + ((point.x + 1) * rect.width) / 2,
                rect.top + ((1 - point.y) * rect.height) / 2,
              ),
            );
          }
        }
      }
      return {
        left: projected.min.x,
        top: projected.min.y,
        width: projected.max.x - projected.min.x,
        height: projected.max.y - projected.min.y,
      };
    },
    setVisible(next) {
      visible = next;
      if (!next && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (next) requestRender();
    },
    setPaused(next) {
      paused = next;
      if (next) window.clearTimeout(idleTimer);
      else {
        // Continue from the displayed pose rather than a target changed while reading.
        targetYaw = bookPivot.rotation.y;
        targetRoll =
          bookPivot.rotation.z -
          (reduced ? 0 : Math.sin((phase * Math.PI) / 3) * 0.008);
        returnToIdle();
      }
      requestRender();
    },
    setReducedMotion(next) {
      reduced = next;
      requestRender();
    },
    setScrollProgress(next) {
      scrollProgress = THREE.MathUtils.clamp(next, 0, 1);
      // A model loaded while reading still needs the correct initial scale before freezing.
      if (!hasRendered) {
        progress = reduced ? 1 : scrollProgress;
        bookPivot.scale.setScalar(
          bookScale *
            THREE.MathUtils.lerp(
              0.28,
              1,
              THREE.MathUtils.smoothstep(progress, 0, 1),
            ),
        );
      }
      requestRender();
    },
    rotate(direction) {
      targetYaw = THREE.MathUtils.clamp(targetYaw + direction * 0.2, -1.1, 0.8);
      if (paused || reduced) bookPivot.rotation.y = targetYaw;
      returnToIdle();
      requestRender();
    },
    tilt(direction) {
      targetRoll = THREE.MathUtils.clamp(
        targetRoll + direction * 0.1,
        -0.5,
        0.5,
      );
      if (paused || reduced) bookPivot.rotation.z = targetRoll;
      returnToIdle();
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unregister();
      window.clearTimeout(idleTimer);
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      host.removeEventListener("pointerdown", pointerDown);
      host.removeEventListener("pointermove", pointerMove);
      host.removeEventListener("pointerup", release);
      host.removeEventListener("pointercancel", release);
      host.removeEventListener("lostpointercapture", release);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      if (drag && host.hasPointerCapture(drag.id))
        host.releasePointerCapture(drag.id);
      host.style.cursor = "";
      disposeModel(book);
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
