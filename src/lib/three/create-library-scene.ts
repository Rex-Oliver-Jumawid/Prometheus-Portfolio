import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import type { LibraryBook } from "@/content/library";

type LibrarySceneOptions = {
  host: HTMLElement;
  environmentUrl: string;
  books: readonly LibraryBook[];
  signal: AbortSignal;
  reducedMotion: boolean;
  coarsePointer: boolean;
  onProgress?: (progress: number, label: string) => void;
  onSelectionChange?: (bookId: LibraryBook["id"] | null) => void;
  onHoverChange?: (bookId: LibraryBook["id"] | null) => void;
  onContextLost?: () => void;
};

export type LibraryScene = {
  selectBook: (bookId: LibraryBook["id"]) => boolean;
  resetSelection: () => void;
  getBookBounds: (bookId: LibraryBook["id"]) => {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  setDockProgress: (progress: number) => void;
  setVisible: (visible: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setCoarsePointer: (coarse: boolean) => void;
  setHovered: (bookId: LibraryBook["id"] | null) => void;
  dispose: () => void;
};

type RuntimeBook = LibraryBook & {
  wrapper: THREE.Group;
  scene: THREE.Group;
  rootObject: THREE.Object3D;
  anchor: THREE.Object3D;
  dimensions: THREE.Vector3;
  height: number;
  restCenter: THREE.Vector3;
  outward: THREE.Vector3;
  meshes: THREE.Mesh[];
  targetPosition: THREE.Vector3;
  targetQuaternion: THREE.Quaternion;
};

const PRESENTATION_ASPECT = 16 / 9;
const RECEIVER_NAMES = [
  "ShadowReceiver_TopShelf",
  "ShadowReceiver_BottomShelf",
  "ShadowReceiver_BackPanel",
] as const;
const IDENTITY_QUATERNION = new THREE.Quaternion();
const IDENTITY_SCALE = new THREE.Vector3(1, 1, 1);

function disposeRoot(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    geometries.add(object.geometry);
    const ownedMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    ownedMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    texture.dispose();
    const image = texture.image as { close?: () => void } | undefined;
    image?.close?.();
  });

  root.removeFromParent();
}

async function loadGltf(
  loader: GLTFLoader,
  url: string,
  signal: AbortSignal,
) {
  const resolvedUrl = new URL(url, window.location.href).href;
  const response = await fetch(resolvedUrl, { signal });
  if (!response.ok) {
    throw new Error(`Could not load library asset (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (signal.aborted)
    throw new DOMException("Library loading cancelled", "AbortError");

  return loader.parseAsync(arrayBuffer, new URL(".", resolvedUrl).href);
}

export async function createLibraryScene(
  options: LibrarySceneOptions,
): Promise<LibraryScene> {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 2 ** 0.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  options.host.append(renderer.domElement);

  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0b09);

  let camera: THREE.PerspectiveCamera | null = null;
  let visible = true;
  let reducedMotion = options.reducedMotion;
  let coarsePointer = options.coarsePointer;
  let selected: LibraryBook["id"] | null = null;
  let hovered: LibraryBook["id"] | null = null;
  let disposed = false;
  let frame = 0;
  let renderDirty = true;
  let previousFrameTime = performance.now();
  let pointerDirty = false;
  let lastRaycastTime = 0;
  let environmentEmphasis = 1;
  let dockProgress = reducedMotion ? 1 : 0;
  let viewport = {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    canvasWidth: 1,
    canvasHeight: 1,
  };

  const pointer = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  const currentParallax = new THREE.Vector2();
  const baseCameraPosition = new THREE.Vector3();
  const baseCameraQuaternion = new THREE.Quaternion();
  const cameraLookTarget = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  const runtimeBooks = new Map<LibraryBook["id"], RuntimeBook>();
  const staticMeshes: THREE.Mesh[] = [];
  const bakedMaterials: Array<{
    material: THREE.MeshBasicMaterial;
    baseColor: THREE.Color;
  }> = [];
  const ownedRoots: THREE.Object3D[] = [];
  const lights: THREE.Object3D[] = [];
  const sharedBookTextures = new Map<string, THREE.Texture>();
  let environment: THREE.Group | null = null;

  function progress(value: number, label: string) {
    options.onProgress?.(Math.max(0, Math.min(100, value)), label);
  }

  function updateHovered(next: LibraryBook["id"] | null) {
    if (hovered === next) return;
    hovered = next;
    renderDirty = true;
    renderer.domElement.style.cursor = next ? "pointer" : "default";
    options.onHoverChange?.(next);
  }

  function syncSelection(next: LibraryBook["id"] | null) {
    if (selected === next) return;
    selected = next;
    renderDirty = true;
    options.onSelectionChange?.(selected);
  }

  function resetSelection() {
    syncSelection(null);
  }

  function selectBook(bookId: LibraryBook["id"]) {
    if (!runtimeBooks.has(bookId)) return false;
    syncSelection(selected === bookId ? null : bookId);
    return true;
  }

  function resize() {
    if (disposed) return;
    const width = Math.max(1, Math.round(options.host.clientWidth));
    const height = Math.max(1, Math.round(options.host.clientHeight));

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);

    let viewWidth = width;
    let viewHeight = width / PRESENTATION_ASPECT;
    if (viewHeight > height) {
      viewHeight = height;
      viewWidth = height * PRESENTATION_ASPECT;
    }

    viewport = {
      x: (width - viewWidth) / 2,
      y: (height - viewHeight) / 2,
      width: viewWidth,
      height: viewHeight,
      canvasWidth: width,
      canvasHeight: height,
    };

    if (camera) {
      camera.aspect = PRESENTATION_ASPECT;
      camera.updateProjectionMatrix();
    }

    pointerDirty = true;
    renderDirty = true;
  }

  function renderScene() {
    if (!camera || disposed) return;

    renderer.info.reset();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, viewport.canvasWidth, viewport.canvasHeight);
    renderer.setClearColor(0x0c0b09, 1);
    renderer.clear(true, true, true);
    renderer.setViewport(
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
    );
    renderer.setScissor(
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
    );
    renderer.setScissorTest(true);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
  }

  function eventToPointer(event: PointerEvent | MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left - viewport.x;
    const topOffset =
      viewport.canvasHeight - viewport.y - viewport.height;
    const y = event.clientY - rect.top - topOffset;

    if (
      x < 0 ||
      y < 0 ||
      x > viewport.width ||
      y > viewport.height
    ) {
      return false;
    }

    pointer.set(
      (x / viewport.width) * 2 - 1,
      -((y / viewport.height) * 2 - 1),
    );
    return true;
  }

  function getBookBounds(bookId: LibraryBook["id"]) {
    if (!camera || disposed) return null;

    const book = runtimeBooks.get(bookId);
    if (!book) return null;

    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(book.wrapper);
    if (bounds.isEmpty()) return null;

    const canvasRect = renderer.domElement.getBoundingClientRect();
    const topOffset =
      viewport.canvasHeight - viewport.y - viewport.height;
    const corners = [
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
    ];

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    corners.forEach((corner) => {
      const projected = corner.project(camera!);
      const x =
        canvasRect.left +
        viewport.x +
        ((projected.x + 1) / 2) * viewport.width;
      const y =
        canvasRect.top +
        topOffset +
        ((1 - projected.y) / 2) * viewport.height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      left: minX,
      top: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  function syncDockVisibility() {
    runtimeBooks.forEach((book) => {
      book.wrapper.visible = reducedMotion || dockProgress >= 0.985;
    });
    renderDirty = true;
  }

  function pickBook() {
    if (!camera || disposed || dockProgress < 0.985) return null;

    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const meshes = [
      ...staticMeshes,
      ...[...runtimeBooks.values()].flatMap((book) => book.meshes),
    ];
    const first = raycaster.intersectObjects(meshes, false)[0];
    return (first?.object.userData.libraryBookId ??
      null) as LibraryBook["id"] | null;
  }

  function animateBooks(dt: number) {
    let changing = false;
    const amount = reducedMotion ? 1 : 1 - Math.exp(-dt * 10);

    runtimeBooks.forEach((book) => {
      const isSelected = book.id === selected;
      const isHovered =
        book.id === hovered && !coarsePointer && !reducedMotion;

      book.targetPosition.set(0, 0, 0);
      book.targetQuaternion.identity();

      if (isSelected) {
        const anchorQuaternion = book.anchor.getWorldQuaternion(
          new THREE.Quaternion(),
        );
        const towardCamera = baseCameraPosition
          .clone()
          .sub(book.restCenter)
          .normalize();
        const faceNormal = book.outward
          .clone()
          .applyQuaternion(anchorQuaternion);
        const worldTurn = new THREE.Quaternion().setFromUnitVectors(
          faceNormal,
          towardCamera,
        );
        const localTurn = anchorQuaternion
          .clone()
          .invert()
          .multiply(worldTurn)
          .multiply(anchorQuaternion);

        book.targetQuaternion.slerp(localTurn, 0.78);
        book.targetPosition
          .copy(book.outward)
          .multiplyScalar(book.height * 0.22);

        const inverseAnchor = book.anchor.matrixWorld.clone().invert();
        const cameraStepWorld = towardCamera.multiplyScalar(book.height * 0.07);
        const cameraStepLocal = cameraStepWorld.applyMatrix3(
          new THREE.Matrix3().setFromMatrix4(inverseAnchor),
        );
        book.targetPosition.add(cameraStepLocal);
      } else if (isHovered) {
        book.targetPosition
          .copy(book.outward)
          .multiplyScalar(book.height * 0.04);
        book.targetQuaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          THREE.MathUtils.degToRad(1.5),
        );
      }

      if (
        book.wrapper.position.distanceToSquared(book.targetPosition) > 1e-10 ||
        book.wrapper.quaternion.angleTo(book.targetQuaternion) > 0.00001
      ) {
        changing = true;
      }

      book.wrapper.position.lerp(book.targetPosition, amount);
      book.wrapper.quaternion.slerp(book.targetQuaternion, amount);

      if (
        book.wrapper.position.distanceToSquared(book.targetPosition) < 1e-10
      ) {
        book.wrapper.position.copy(book.targetPosition);
      }
      if (
        book.wrapper.quaternion.angleTo(book.targetQuaternion) < 0.00001
      ) {
        book.wrapper.quaternion.copy(book.targetQuaternion);
      }
    });

    const targetEmphasis = selected ? 0.72 : 1;
    if (Math.abs(environmentEmphasis - targetEmphasis) > 0.00001) {
      changing = true;
    }

    environmentEmphasis = THREE.MathUtils.lerp(
      environmentEmphasis,
      targetEmphasis,
      amount,
    );

    if (Math.abs(environmentEmphasis - targetEmphasis) < 0.00001) {
      environmentEmphasis = targetEmphasis;
    }

    bakedMaterials.forEach(({ material, baseColor }) => {
      material.color.copy(baseColor).multiplyScalar(environmentEmphasis);
    });

    return changing;
  }

  function animateCamera(dt: number) {
    if (!camera) return false;

    const oldPosition = camera.position.clone();
    const oldQuaternion = camera.quaternion.clone();
    const enabled = !reducedMotion && !coarsePointer;

    currentParallax.lerp(
      enabled ? parallax : new THREE.Vector2(),
      reducedMotion ? 1 : 1 - Math.exp(-dt * 5),
    );

    camera.position
      .copy(baseCameraPosition)
      .addScaledVector(cameraRight, currentParallax.x * 0.035)
      .addScaledVector(cameraUp, currentParallax.y * 0.02);

    if (currentParallax.lengthSq() < 1e-8) {
      camera.quaternion.copy(baseCameraQuaternion);
    } else {
      camera.lookAt(cameraLookTarget);
    }

    camera.updateMatrixWorld();

    return (
      oldPosition.distanceToSquared(camera.position) > 1e-14 ||
      oldQuaternion.angleTo(camera.quaternion) > 1e-7
    );
  }

  function animate(now: number) {
    frame = 0;
    if (disposed || !visible || !camera) return;

    const elapsed = Math.max(0, now - previousFrameTime);
    previousFrameTime = now;
    const dt = Math.min(elapsed / 1000, 0.05);

    const booksChanging = animateBooks(dt);
    const cameraChanging = animateCamera(dt);

    if (pointerDirty && now - lastRaycastTime >= 25) {
      updateHovered(pickBook());
      pointerDirty = false;
      lastRaycastTime = now;
    }

    if (renderDirty || booksChanging || cameraChanging) {
      renderScene();
      renderDirty = false;
    }

    frame = requestAnimationFrame(animate);
  }

  function requestLoop() {
    if (disposed || !visible || frame) return;
    previousFrameTime = performance.now();
    frame = requestAnimationFrame(animate);
  }

  function pointerMove(event: PointerEvent) {
    const inside = eventToPointer(event);
    if (!inside) {
      updateHovered(null);
      parallax.set(0, 0);
      return;
    }

    if (!coarsePointer && !reducedMotion) parallax.copy(pointer);
    pointerDirty = true;
  }

  function pointerLeave() {
    updateHovered(null);
    parallax.set(0, 0);
    pointerDirty = false;
  }

  function click(event: MouseEvent) {
    if (!camera) return;
    const bookId = eventToPointer(event) ? pickBook() : null;
    if (bookId) selectBook(bookId);
    else resetSelection();
  }

  function contextLost(event: Event) {
    event.preventDefault();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
    options.onContextLost?.();
  }

  const loader = new GLTFLoader();
  const loadedRoots: THREE.Object3D[] = [];

  try {
    progress(4, "Opening the library...");

    let completed = 0;
    const total = options.books.length + 1;
    const loadTracked = async (url: string) => {
      const gltf = await loadGltf(loader, url, options.signal);
      loadedRoots.push(gltf.scene);
      completed += 1;
      progress(
        8 + (completed / total) * 72,
        "Unpacking the antique collection...",
      );
      return gltf;
    };

    const [environmentGltf, ...bookGltfs] = await Promise.all([
      loadTracked(options.environmentUrl),
      ...options.books.map((book) => loadTracked(book.modelUrl)),
    ]);

    if (options.signal.aborted) {
      throw new DOMException("Library loading cancelled", "AbortError");
    }

    environment = environmentGltf.scene;
    ownedRoots.push(environment);
    scene.add(environment);
    environment.updateMatrixWorld(true);

    const receiverMeshes = new Set<THREE.Mesh>();
    RECEIVER_NAMES.forEach((name) => {
      const node = environment?.getObjectByName(name);
      if (!node) throw new Error(`The library is missing ${name}.`);

      node.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        receiverMeshes.add(object);
        const receiverMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        receiverMaterials.forEach((material) => material.dispose());
        object.material = new THREE.ShadowMaterial({
          color: 0x000000,
          opacity: 0.28,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
          side: THREE.DoubleSide,
          forceSinglePass: true,
          toneMapped: false,
        });
        object.castShadow = false;
        object.receiveShadow = true;
        if (!object.geometry.attributes.normal) {
          object.geometry.computeVertexNormals();
        }
        object.renderOrder = 3;
      });
    });

    const convertedMaterials = new Map<
      THREE.Material,
      THREE.MeshBasicMaterial
    >();

    environment.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || receiverMeshes.has(object)) {
        return;
      }

      object.castShadow = false;
      object.receiveShadow = false;

      const oldMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const materials = oldMaterials.map((oldMaterial) => {
        const existing = convertedMaterials.get(oldMaterial);
        if (existing) return existing;

        const sourceMaterial = oldMaterial as THREE.MeshStandardMaterial;
        const map = sourceMaterial.map ?? sourceMaterial.emissiveMap ?? null;
        if (map) map.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({
          name: `${oldMaterial.name || "Environment"}_Baked`,
          map,
          color: map ? 0xffffff : sourceMaterial.color ?? 0xffffff,
          transparent: oldMaterial.transparent,
          opacity: oldMaterial.opacity,
          alphaTest: oldMaterial.alphaTest,
          side: oldMaterial.side,
          depthWrite: oldMaterial.depthWrite,
          vertexColors: sourceMaterial.vertexColors,
          toneMapped: object.userData.bakedColorSpace === "linear",
          fog: false,
        });

        convertedMaterials.set(oldMaterial, material);
        bakedMaterials.push({
          material,
          baseColor: material.color.clone(),
        });
        oldMaterial.dispose();
        return material;
      });

      object.material = Array.isArray(object.material)
        ? materials
        : materials[0]!;
      staticMeshes.push(object);
    });

    const sourceCamera =
      environment.getObjectByName("Prometheus_Library_Camera") ??
      environmentGltf.cameras.find(
        (entry) => entry.name === "Prometheus_Library_Camera",
      );

    if (!(sourceCamera instanceof THREE.PerspectiveCamera)) {
      throw new Error(
        "The library environment is missing its presentation camera.",
      );
    }

    sourceCamera.updateWorldMatrix(true, false);
    camera = sourceCamera.clone(false) as THREE.PerspectiveCamera;
    camera.name = "Prometheus_Library_Web_Camera";
    sourceCamera.matrixWorld.decompose(
      camera.position,
      camera.quaternion,
      camera.scale,
    );
    camera.aspect = PRESENTATION_ASPECT;
    camera.updateProjectionMatrix();
    scene.add(camera);

    baseCameraPosition.copy(camera.position);
    baseCameraQuaternion.copy(camera.quaternion);
    cameraRight.set(1, 0, 0).applyQuaternion(baseCameraQuaternion);
    cameraUp.set(0, 1, 0).applyQuaternion(baseCameraQuaternion);

    const shelfCenter = new THREE.Box3()
      .setFromObject(environment)
      .getCenter(new THREE.Vector3());
    const focusDistance = Math.max(
      1,
      baseCameraPosition.distanceTo(shelfCenter),
    );
    cameraLookTarget
      .copy(baseCameraPosition)
      .add(
        new THREE.Vector3(0, 0, -focusDistance).applyQuaternion(
          baseCameraQuaternion,
        ),
      );

    options.books.forEach((definition, index) => {
      const gltf = bookGltfs[index];
      const anchor = environment?.getObjectByName(definition.anchor);
      if (!anchor) {
        throw new Error(
          `${definition.title} is missing its shelf anchor ${definition.anchor}.`,
        );
      }

      const sourceRoot = gltf.scene.getObjectByName(definition.root);
      if (!sourceRoot) {
        throw new Error(
          `${definition.title} is missing its book root ${definition.root}.`,
        );
      }

      if (
        !definition.fit &&
        (sourceRoot.position.length() > 0.00001 ||
          sourceRoot.quaternion.angleTo(IDENTITY_QUATERNION) > 0.00001 ||
          sourceRoot.scale.distanceTo(IDENTITY_SCALE) > 0.00001)
      ) {
        throw new Error(
          `${definition.title} must keep its resting transform in the library anchor.`,
        );
      }

      const wrapper = new THREE.Group();
      wrapper.name = `Interactive_${definition.id}`;
      wrapper.add(gltf.scene);

      if (definition.fit) {
        gltf.scene.updateWorldMatrix(true, true);
        const rawBounds = new THREE.Box3().setFromObject(gltf.scene);
        const rawSize = rawBounds.getSize(new THREE.Vector3());
        const rawCenter = rawBounds.getCenter(new THREE.Vector3());
        if (!Number.isFinite(rawSize.y) || rawSize.y <= 0) {
          throw new Error(`${definition.title} cannot be fitted to the shelf.`);
        }

        const scale = definition.fit.targetHeight / rawSize.y;
        const yaw = THREE.MathUtils.degToRad(definition.fit.yawDegrees);
        const fittedCenter = rawCenter
          .clone()
          .multiplyScalar(scale)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        gltf.scene.scale.setScalar(scale);
        gltf.scene.rotation.y = yaw;
        gltf.scene.position.copy(fittedCenter).multiplyScalar(-1);
      }

      anchor.add(wrapper);
      wrapper.visible = reducedMotion || dockProgress >= 0.88;
      ownedRoots.push(gltf.scene);
      wrapper.updateWorldMatrix(true, true);

      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const dimensions = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const height = dimensions.y;
      if (!Number.isFinite(height) || height <= 0) {
        throw new Error(`${definition.title} has no visible book geometry.`);
      }

      const outwardExtra = sourceRoot.userData.local_outward as
        | number[]
        | undefined;
      const outward = Array.isArray(outwardExtra)
        ? new THREE.Vector3().fromArray(outwardExtra).normalize()
        : new THREE.Vector3(-1, 0, 0);

      const runtimeBook: RuntimeBook = {
        ...definition,
        wrapper,
        scene: gltf.scene,
        rootObject: sourceRoot,
        anchor,
        dimensions,
        height,
        restCenter: center,
        outward,
        meshes: [],
        targetPosition: new THREE.Vector3(),
        targetQuaternion: new THREE.Quaternion(),
      };

      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.libraryBookId = definition.id;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          material.toneMapped = true;

          const standard = material as THREE.MeshStandardMaterial;
          for (const slot of [
            "map",
            "normalMap",
            "roughnessMap",
            "metalnessMap",
          ] as const) {
            const texture = standard[slot];
            if (!(texture instanceof THREE.Texture) || !texture.name) continue;

            const key = `${texture.name}:${texture.colorSpace}`;
            const existing = sharedBookTextures.get(key);
            if (existing) standard[slot] = existing;
            else sharedBookTextures.set(key, texture);
          }
        });

        runtimeBook.meshes.push(object);
      });

      runtimeBooks.set(definition.id, runtimeBook);
    });

    const environmentBounds = new THREE.Box3().setFromObject(environment);
    const environmentCenter = environmentBounds.getCenter(new THREE.Vector3());
    const extent = environmentBounds.getSize(new THREE.Vector3());
    const sunDirection = new THREE.Vector3(
      0.7845877408981323,
      -0.47075262665748596,
      -0.4035022258758545,
    ).normalize();

    const sun = new THREE.DirectionalLight(
      new THREE.Color(1, 0.865, 0.695),
      3,
    );
    sun.position.copy(environmentCenter).addScaledVector(sunDirection, -8);
    sun.target.position.copy(environmentCenter);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);

    const halfSize = Math.max(extent.x, extent.y, extent.z) * 0.66;
    Object.assign(sun.shadow.camera, {
      left: -halfSize,
      right: halfSize,
      top: halfSize,
      bottom: -halfSize,
      near: 0.1,
      far: 25,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.00012;
    sun.shadow.normalBias = 0.0035;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);

    const fill = new THREE.HemisphereLight(0xbccedf, 0x22180e, 0.42);
    scene.add(fill);

    const windowBounce = new THREE.RectAreaLight(
      new THREE.Color(1, 0.845, 0.665),
      18,
      1.35,
      2.15,
    );
    windowBounce.position.set(-3.7, 4.6, 2.65);
    windowBounce.lookAt(-0.8, 1.7, 0.1);
    scene.add(windowBounce);

    lights.push(sun, sun.target, fill, windowBounce);

    resize();
    progress(88, "Preparing the light and textures...");
    await renderer.compileAsync(scene, camera);
    renderScene();
    progress(100, "The library is ready.");
  } catch (error) {
    loadedRoots.forEach((root) => {
      if (!ownedRoots.includes(root)) disposeRoot(root);
    });
    ownedRoots.forEach(disposeRoot);
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    throw error;
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(options.host);

  renderer.domElement.addEventListener("pointermove", pointerMove, {
    passive: true,
  });
  renderer.domElement.addEventListener("pointerleave", pointerLeave);
  renderer.domElement.addEventListener("click", click);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);

  requestLoop();

  return {
    selectBook(bookId) {
      const changed = selectBook(bookId);
      requestLoop();
      return changed;
    },
    resetSelection() {
      resetSelection();
      requestLoop();
    },
    getBookBounds(bookId) {
      return getBookBounds(bookId);
    },
    setDockProgress(next) {
      dockProgress = THREE.MathUtils.clamp(next, 0, 1);
      syncDockVisibility();
      requestLoop();
    },
    setVisible(next) {
      visible = next;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (visible) {
        renderDirty = true;
        requestLoop();
      }
    },
    setReducedMotion(next) {
      reducedMotion = next;
      if (reducedMotion) {
        parallax.set(0, 0);
        currentParallax.set(0, 0);
      }
      syncDockVisibility();
      pointerDirty = true;
      renderDirty = true;
      requestLoop();
    },
    setCoarsePointer(next) {
      coarsePointer = next;
      if (coarsePointer) {
        parallax.set(0, 0);
        currentParallax.set(0, 0);
      }
      pointerDirty = true;
      renderDirty = true;
      requestLoop();
    },
    setHovered(bookId) {
      updateHovered(bookId);
      requestLoop();
    },
    dispose() {
      if (disposed) return;
      disposed = true;

      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();

      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerleave", pointerLeave);
      renderer.domElement.removeEventListener("click", click);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        contextLost,
      );

      lights.forEach((light) => {
        if (light instanceof THREE.DirectionalLight) {
          light.shadow.map?.dispose();
        }
        light.removeFromParent();
      });

      const roots = new Set(ownedRoots);
      roots.forEach(disposeRoot);
      runtimeBooks.clear();
      sharedBookTextures.clear();
      bakedMaterials.length = 0;
      staticMeshes.length = 0;

      camera?.removeFromParent();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
