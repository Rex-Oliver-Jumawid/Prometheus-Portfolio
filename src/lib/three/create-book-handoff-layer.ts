import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HANDOFF, type BookView } from "./book-handoff";

/** Normalize camera-space depth to one to blend orthographic and perspective
 * projections without changing either endpoint. Rects are measured, not authored. */
function endpoint(
  view: BookView,
  center: THREE.Vector3,
  width: number,
  height: number,
) {
  view.object.updateWorldMatrix(true, true);
  view.camera.updateMatrixWorld();
  const model = view.camera.matrixWorldInverse
    .clone()
    .multiply(view.object.matrixWorld)
    .multiply(
      new THREE.Matrix4().makeTranslation(center.x, center.y, center.z),
    );
  const position = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    scale = new THREE.Vector3();
  model.decompose(position, rotation, scale);
  const depth = Math.max(0.001, -position.z);
  position.divideScalar(depth);
  scale.divideScalar(depth);
  const projection = view.camera.projectionMatrix
    .clone()
    .multiply(new THREE.Matrix4().makeScale(depth, depth, depth));
  const w = new THREE.Vector4(0, 0, -1, 1).applyMatrix4(projection).w;
  projection.elements.forEach((value, i) => {
    projection.elements[i] = value / w;
  });
  const rect = view.rect;
  projection.premultiply(
    new THREE.Matrix4().set(
      rect.width / width,
      0,
      0,
      (2 * rect.left + rect.width) / width - 1,
      0,
      rect.height / height,
      0,
      1 - (2 * rect.top + rect.height) / height,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    ),
  );
  return { position, rotation, scale, projection, depth };
}

function localCenter(object: THREE.Object3D) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(),
    bounds = new THREE.Box3();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.computeBoundingBox();
    if (child.geometry.boundingBox)
      bounds.union(
        child.geometry.boundingBox
          .clone()
          .applyMatrix4(inverse.clone().multiply(child.matrixWorld)),
      );
  });
  return bounds.getCenter(new THREE.Vector3());
}

export function createBookHandoffLayer(host: HTMLElement, onLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 2 ** 0.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.Camera();
  // PMREM render targets belong to their WebGL context. Recreate the gallery's
  // lighting here; borrowing its GPU texture would sample an empty environment.
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  const lights = new Map<THREE.Light, THREE.Light>();
  let size = "";
  const contextLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);

  function syncLights(view: BookView, depth: number, weight: number) {
    const transform = new THREE.Matrix4()
      .makeScale(1 / depth, 1 / depth, 1 / depth)
      .multiply(view.camera.matrixWorldInverse);
    view.scene.traverse((object) => {
      if (!(object instanceof THREE.Light)) return;
      let light = lights.get(object);
      if (!light) {
        light = object.clone();
        lights.set(object, light);
        scene.add(light);
        if (light instanceof THREE.DirectionalLight) scene.add(light.target);
      }
      light.intensity = object.intensity * weight;
      light.matrixAutoUpdate = false;
      light.matrix.copy(transform).multiply(object.matrixWorld);
      if (
        light instanceof THREE.RectAreaLight &&
        object instanceof THREE.RectAreaLight
      ) {
        // Three extracts only the rotation from area-light matrices.
        light.width = object.width / depth;
        light.height = object.height / depth;
      }
      if (
        light instanceof THREE.DirectionalLight &&
        object instanceof THREE.DirectionalLight
      ) {
        object.target.updateWorldMatrix(true, false);
        light.target.position
          .setFromMatrixPosition(object.target.matrixWorld)
          .applyMatrix4(transform);
        const source = object.shadow.camera;
        Object.assign(light.shadow.camera, {
          left: source.left / depth,
          right: source.right / depth,
          top: source.top / depth,
          bottom: source.bottom / depth,
          near: source.near / depth,
          far: source.far / depth,
        });
        light.shadow.normalBias = object.shadow.normalBias / depth;
        light.shadow.intensity = object.shadow.intensity;
        light.shadow.camera.updateProjectionMatrix();
      }
    });
  }

  return {
    render(source: BookView, target: BookView, progress: number) {
      const width = window.innerWidth,
        height = window.innerHeight;
      const nextSize = `${width}:${height}:${window.devicePixelRatio}`;
      if (size !== nextSize) {
        size = nextSize;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
      }
      const center = localCenter(source.object);
      const from = endpoint(source, center, width, height),
        to = endpoint(target, center, width, height);
      const position = from.position.clone().lerp(to.position, progress);
      const rotation = from.rotation.clone().slerp(to.rotation, progress);
      const scale = from.scale.clone().lerp(to.scale, progress);
      from.projection.elements.forEach((value, i) => {
        camera.projectionMatrix.elements[i] = THREE.MathUtils.lerp(
          value,
          to.projection.elements[i],
          progress,
        );
      });
      const a = from.position.clone().applyMatrix4(from.projection);
      const b = to.position.clone().applyMatrix4(to.projection);
      const actual = position.clone().applyMatrix4(camera.projectionMatrix);
      const desired = a.lerp(b, progress);
      desired.y += Math.sin(Math.PI * progress) * HANDOFF.arc;
      camera.projectionMatrix.premultiply(
        new THREE.Matrix4().makeTranslation(
          desired.x - actual.x,
          desired.y - actual.y,
          0,
        ),
      );
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      if (source.scene === target.scene) syncLights(source, from.depth, 1);
      else {
        syncLights(source, from.depth, 1 - progress);
        syncLights(target, to.depth, progress);
      }
      scene.environmentIntensity =
        source.scene.environmentIntensity * (1 - progress);

      // Borrow the live source object for this synchronous draw. No geometry,
      // material, texture, or environment ownership transfers to this renderer.
      const object = source.object,
        parent = object.parent!;
      const matrix = object.matrix.clone(),
        auto = object.matrixAutoUpdate,
        visible = object.visible;
      scene.add(object);
      object.visible = true;
      object.matrixAutoUpdate = false;
      object.matrix
        .compose(position, rotation, scale)
        .multiply(
          new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z),
        );
      try {
        renderer.render(scene, camera);
      } finally {
        parent.add(object);
        object.matrix.copy(matrix);
        object.matrixAutoUpdate = auto;
        object.visible = visible;
        object.updateWorldMatrix(true, true);
      }
      host.dataset.progress = String(progress);
    },
    dispose() {
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      lights.forEach((light) => {
        if (light instanceof THREE.DirectionalLight)
          light.shadow.map?.dispose();
      });
      scene.clear();
      lights.clear();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
