// studio.js — a neutral photo studio that turns ONE part into a WorldModule.
//
// A part is a pure function `build(params) -> THREE.Object3D` living in
// worlds/<name>/parts/<part>.js. It knows nothing about scenes, cameras or lights,
// so the studio supplies them: three-point light, grey seamless, ground grid, and a
// graduated staff so absolute size is readable in the frame.
//
// The returned object satisfies the WorldModule contract, which is the whole point:
// play.html, harness/lib.mjs and the screenshot pipeline drive it unchanged.
//
//   import { createStudio, VIEWS } from '/runtime/studio.js';
//   const studio = createStudio(container, buildHorn(params));
//   studio.setView('front'); studio.renderFrame(0); studio.getFacts();
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BG = 0xb4b9c1;          // neutral mid-grey: reads form without flattering it
const GROUND = 0x969ca5;
const STAFF_A = 0xf2f4f7;     // graduated staff bands, 0.1 m each
const STAFF_B = 0x3a4048;

/** Canonical review viewpoints. `iso` + `isoback` are deliberately opposed so every
 *  face of a closed form appears in at least one of them — back/left/bottom features
 *  are covered by default, not by suspicion (text-to-cad snapshot-review). */
export const VIEWS = {
  iso:     { dir: [1, 0.78, 1], ortho: false },
  isoback: { dir: [-1, 0.62, -0.9], ortho: false },
  front:   { dir: [0, 0, 1], ortho: true, extent: (s) => [s.x, s.y] },
  side:    { dir: [1, 0, 0], ortho: true, extent: (s) => [s.z, s.y] },
  top:     { dir: [0, 1, 1e-4], ortho: true, extent: (s) => [s.x, s.z] },
};

/** The four-shot review packet: two opposed isos for coverage, top for pattern and
 *  symmetry, front for profile. */
export const PACKET = ['iso', 'isoback', 'top', 'front'];

const niceStep = (r) => {
  const raw = r / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= raw) ?? pow * 10;
};

/**
 * @param {HTMLElement} container
 * @param {THREE.Object3D} root      what a part's build() returned
 * @param {{ tick?: (dt:number)=>void, pad?: number, staff?: boolean, grid?: boolean }} [opts]
 */
export function createStudio(container, root, opts = {}) {
  const pad = opts.pad ?? 1.22;
  const w = container.clientWidth || 1280;
  const h = container.clientHeight || 720;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.add(root);

  // Metals are black without an environment to reflect. Generated, not a downloaded HDRI (D4).
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // ---- measure the subject before dressing the set ----
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1e-3);

  // ---- ground + grid (cell size adapts, so a mug and a truck both read) ----
  const cell = niceStep(radius);
  const span = Math.max(cell * 12, radius * 8);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(span / 2, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: GROUND, roughness: 0.95 }));
  ground.position.y = -0.0015;                 // hairline below zero: no z-fighting with a grounded part
  ground.receiveShadow = true;
  const grid = new THREE.GridHelper(cell * 12, 12, 0x6f757e, 0x848a93);
  grid.material.opacity = 0.45;
  grid.material.transparent = true;
  grid.visible = opts.grid !== false;
  // The studio is a rig, not the subject. Naming its furniture lets a tool tell the two
  // apart — a product shot hides everything named `studio:` and keeps only the part.
  ground.name = 'studio:ground';
  grid.name = 'studio:grid';
  scene.add(ground, grid);

  // ---- graduated staff: 0.1 m bands, so absolute scale is in the picture ----
  //
  // TWO meshes, not one per band. The band count scales with the SUBJECT: a 1 m object gets a
  // dozen and a 56 m ship gets 639, and 639 objects for a ruler is both wasteful and actively
  // misleading — `verify` walks the scene graph to count draw calls, so the harness's own tape
  // measure was being charged to the world's budget and failing it. The rig must never be the
  // reason a work does not fit.
  const staff = new THREE.Group();
  const staffH = Math.max(1.0, Math.ceil((size.y * 1.15) / 0.1) * 0.1);
  const bandMats = [new THREE.MeshStandardMaterial({ color: STAFF_A, roughness: 0.7 }),
                    new THREE.MeshStandardMaterial({ color: STAFF_B, roughness: 0.7 })];
  const halves = [[], []];
  for (let i = 0; i < Math.round(staffH / 0.1); i++) {
    halves[i % 2].push(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 12)
      .translate(0, i * 0.1 + 0.05, 0));
  }
  for (let i = 0; i < 2; i++) {
    if (!halves[i].length) continue;
    const band = new THREE.Mesh(mergeGeometries(halves[i], false), bandMats[i]);
    band.castShadow = true;
    staff.add(band);
  }
  staff.position.set(box.max.x + Math.max(0.12, radius * 0.3), 0, center.z);
  staff.visible = opts.staff !== false;
  staff.name = 'studio:staff';
  scene.add(staff);

  // ---- three-point light, scaled to the subject ----
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(radius * 2.2, radius * 3.0, radius * 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const d = radius * 2.6;
  Object.assign(key.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 0.05, far: radius * 12 });
  key.shadow.bias = -0.0006;
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.85);            // keeps the shadow side readable
  fill.position.set(-radius * 3, radius * 1.4, radius * 1.6);
  const rim = new THREE.DirectionalLight(0xffffff, 1.5);              // separates form from ground
  rim.position.set(-radius * 1.2, radius * 2.0, -radius * 3);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xdfe6f2, 0x8b9099, 0.65));

  // ---- cameras: perspective for isos, orthographic for the flat checks ----
  const persp = new THREE.PerspectiveCamera(38, w / h, radius / 100, radius * 40);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, radius / 100, radius * 40);
  let active = persp;
  let view = 'iso';

  const orbit = new OrbitControls(persp, renderer.domElement);
  orbit.target.copy(center);

  /** Distance at which the subject's *projected* extents just fill the frame.
   *  Fitting the bounding sphere instead (radius / sin(fov/2)) is the lazy version and it
   *  leaves a flat-ish object floating in a sea of grey — a review shot must fill the frame. */
  function fitDistance(dir) {
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const tanV = Math.tan((persp.fov * Math.PI) / 360);
    const tanH = tanV * ((container.clientWidth || w) / (container.clientHeight || h));
    const v = new THREE.Vector3();
    let dist = radius;
    for (const cx of [box.min.x, box.max.x])
      for (const cy of [box.min.y, box.max.y])
        for (const cz of [box.min.z, box.max.z]) {
          v.set(cx, cy, cz).sub(center);
          const depth = v.dot(dir);              // + is toward the camera
          dist = Math.max(dist,
            Math.abs(v.dot(right)) / tanH + depth,
            Math.abs(v.dot(up)) / tanV + depth);
        }
    return dist * pad;
  }

  function setView(name) {
    const v = VIEWS[name];
    if (!v) throw new Error(`studio: unknown view "${name}" (have ${Object.keys(VIEWS).join(', ')})`);
    view = name;
    const dir = new THREE.Vector3(...v.dir).normalize();
    // The staff is a ruler: it belongs in the flat views where you actually read height off it,
    // never in an iso where it would stand between the camera and the subject.
    staff.visible = opts.staff !== false && !!v.ortho && name !== 'top';

    if (v.ortho) {
      const [ew, eh] = v.extent(size);
      const aspect = (container.clientWidth || w) / (container.clientHeight || h);
      let halfH = (eh / 2) * pad;
      let halfW = (ew / 2) * pad;
      if (halfW / halfH > aspect) halfH = halfW / aspect; else halfW = halfH * aspect;
      Object.assign(ortho, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
      ortho.position.copy(center).addScaledVector(dir, radius * 6);
      ortho.up.set(0, 1, 0);
      if (name === 'top') ortho.up.set(0, 0, -1);
      ortho.lookAt(center);
      ortho.updateProjectionMatrix();
      active = ortho;
    } else {
      persp.position.copy(center).addScaledVector(dir, fitDistance(dir));
      persp.lookAt(center);
      orbit.target.copy(center);
      orbit.update();
      active = persp;
    }
    return active;
  }
  setView('iso');

  /** Deterministic facts — the numbers a screenshot cannot tell you. Units: metres. */
  function getFacts() {
    const b = new THREE.Box3().setFromObject(root);
    const s = b.getSize(new THREE.Vector3());
    let triangles = 0, meshes = 0;
    const materials = new Set(), geometries = new Set(), pivots = [];
    root.traverse((o) => {
      if (o.name && o !== root) pivots.push(o.name);
      if (!o.isMesh) return;
      meshes++;
      geometries.add(o.geometry.uuid);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m.uuid));
      const g = o.geometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    });
    const r3 = (n) => Math.round(n * 1000) / 1000;
    return {
      size: { w: r3(s.x), h: r3(s.y), d: r3(s.z) },
      bbox: { minY: r3(b.min.y), maxY: r3(b.max.y) },
      grounded: Math.abs(b.min.y) < 0.002,                       // sits on y=0 (D7 datum)
      centeredXZ: Math.abs(b.getCenter(new THREE.Vector3()).x) < Math.max(0.01, s.x * 0.06)
        && Math.abs(b.getCenter(new THREE.Vector3()).z) < Math.max(0.01, s.z * 0.06),
      aspect: { wh: r3(s.x / (s.y || 1)), dh: r3(s.z / (s.y || 1)) },
      triangles: Math.round(triangles),
      meshes,
      materials: materials.size,
      geometries: geometries.size,
      sharedGeometry: r3(meshes / Math.max(1, geometries.size)),  // E4: how much is reused
      pivots,
    };
  }

  return {
    getScene: () => scene,
    getCamera: () => active,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => orbit,
    resize() {
      const cw = container.clientWidth, ch = container.clientHeight;
      renderer.setSize(cw, ch);
      persp.aspect = cw / ch;
      persp.updateProjectionMatrix();
      setView(view);
    },
    renderFrame(dt = 0) {
      opts.tick?.(dt);
      renderer.render(scene, active);
    },
    dispose() {
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
    setView,
    getView: () => view,
    getFacts,
  };
}
