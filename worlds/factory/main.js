// factory — smart-warehouse floor: workers shuttle crates (conveyor ↔ pallet) and
// operate machine consoles, an AGV hauls a load on a loop, a robot arm cycles pick-place.
// brief: a smart warehouse floor — people threading between robot arms and AGVs
// Ported from an earlier r128 prototype (kept verbatim except the r183 adaptation below) (three r128 globals → r183 ESM + WorldModule).
// Light intensities re-tuned for r183 physical units; the original cover.png is the color truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MK from '/runtime/solid.js';
import { World as ActorWorld } from '/runtime/actors.js';

export default async function createWorld(container) {
  await MK.init();   // refined rounded geometry; 9s timeout → plain-box fallback

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xaab2bb, 26, 60);
  scene.background = new THREE.Color(0xb6bec8);   // the daylight-grey the r128 page gradient provided

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.87;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.05, 200);
  camera.position.set(7.63, 13.66, 9.49);          // = the r128 ctl at az 0.62 / el 0.82 / r 18
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0.5, 0.5, -0.5);
  orbit.minDistance = 4; orbit.maxDistance = 34;
  orbit.minPolarAngle = Math.PI / 2 - 1.4; orbit.maxPolarAngle = Math.PI / 2 - 0.12;
  orbit.update();

  /* env IBL */
  (function () {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#dfe6ee'); g.addColorStop(.5, '#aeb7c0'); g.addColorStop(1, '#6c7480');
    x.fillStyle = g; x.fillRect(0, 0, 32, 128); const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const p = new THREE.PMREMGenerator(renderer); scene.environment = p.fromEquirectangular(t).texture; t.dispose(); p.dispose();
  })();

  /* lights — bright industrial interior (r128 intensities × the r183 physical-unit factor) */
  const hemi = new THREE.HemisphereLight(0xeef3f8, 0x55585c, 4.3); scene.add(hemi);   // r128 0.34: legacy ambient was scaled ~π²
  const sun = new THREE.DirectionalLight(0xfff4e2, 4.5); sun.position.set(-10, 16, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 0.5, far: 48 }); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe0f0, 0.78); fill.position.set(9, 6, -7); scene.add(fill);

  /* helpers */
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, s = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  // rounded box (Manifold CSG); falls back to BoxGeometry if the kit is off
  function rb(w, h, d, r, mat, x = 0, y = 0, z = 0) {
    const geo = MK.rbGeo(w, h, d, r);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
  }
  const M = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x7f817a, roughness: 0.95, metalness: 0.02 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xa6abb0, roughness: 0.4, metalness: 0.65 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3f454c, roughness: 0.5, metalness: 0.5 }),
    rack: new THREE.MeshStandardMaterial({ color: 0xc4571f, roughness: 0.55, metalness: 0.3 }),
    beam: new THREE.MeshStandardMaterial({ color: 0xdca838, roughness: 0.6, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa6742f, roughness: 0.8 }),
    card: new THREE.MeshStandardMaterial({ color: 0xb88f55, roughness: 0.85 }),
    card2: new THREE.MeshStandardMaterial({ color: 0x9c6c3e, roughness: 0.85 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xa7adb2, roughness: 0.9, side: THREE.DoubleSide }),
    panel: new THREE.MeshStandardMaterial({ color: 0x262b32, roughness: 0.5, metalness: 0.4 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x123, emissive: 0x39d0e0, emissiveIntensity: 1.0, roughness: 0.3 }),
    hazard: new THREE.MeshStandardMaterial({ color: 0xddb53f, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2f6fae, roughness: 0.6, metalness: 0.2 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb13a2c, roughness: 0.6 }),
    cone: new THREE.MeshStandardMaterial({ color: 0xe8651f, roughness: 0.7 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x6a7077, roughness: 0.5, metalness: 0.5 }),
  };
  Object.values(M).forEach((m) => { m.envMapIntensity = 0.45; });
  const HX = 8, HZ = 6, WH = 4.2;

  /* floor + painted lanes */
  function floorTex() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#7f817a'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 420; i++) { const g = 110 + Math.random() * 40; x.fillStyle = `rgba(${g},${g},${g - 4},0.06)`; const r = 4 + Math.random() * 22; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, r, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(40,42,40,.3)'; x.lineWidth = 2; for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    // NO SRGBColorSpace here: r128 fed this straight to the shader (= brighter concrete);
    // the authored look depends on it. See the r128-look shim at the bottom.
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 5); return t;
  }
  function sph(r, mat, x = 0, y = 0, z = 0, s = 12) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cone(r, h, mat, x = 0, y = 0, z = 0, s = 16) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  const _floorTex = floorTex();
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshStandardMaterial({ map: _floorTex, roughness: 0.94 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f); }
  // yellow safety lane
  { const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, HZ * 1.7), M.hazard); lane.rotation.x = -Math.PI / 2; lane.position.set(1.0, 0.012, 0.2); scene.add(lane); }
  { const lane = new THREE.Mesh(new THREE.PlaneGeometry(HX * 1.4, 0.18), M.hazard); lane.rotation.x = -Math.PI / 2; lane.position.set(0.5, 0.012, 4.4); scene.add(lane); }

  /* back + side walls with truss roof beams (open front for the overview) */
  scene.add(box(HX * 2, WH, 0.2, M.wall, 0, WH / 2, -HZ));
  scene.add(box(0.2, WH, HZ * 2, M.wall, -HX, WH / 2, 0));
  scene.add(box(0.2, WH, HZ * 2, M.wall, HX, WH / 2, 0));
  for (let x = -HX + 1; x <= HX - 1; x += 2) { scene.add(cyl(0.09, 0.09, WH, M.darkSteel, x, WH / 2, -HZ + 0.2)); } // back columns
  // short ceiling-edge beams hugging the side walls (read as structure without slashing the floor view)
  for (let z = -HZ + 1.2; z <= HZ - 1.2; z += 2.4) { scene.add(box(0.5, 0.16, 0.14, M.darkSteel, -HX + 0.3, WH - 0.12, z)); scene.add(box(0.5, 0.16, 0.14, M.darkSteel, HX - 0.3, WH - 0.12, z)); }

  /* shelving racks along the back */
  function rack(cx, cz) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g); const W = 3.2, D = 0.9, H = 3.6;
    for (const sx of [-W / 2, W / 2]) for (const sz of [-D / 2, D / 2]) g.add(cyl(0.06, 0.06, H, M.rack, sx, H / 2, sz, 8));
    for (const sy of [0.9, 1.9, 2.9]) {
      g.add(box(W, 0.08, 0.12, M.rack, 0, sy, -D / 2)); g.add(box(W, 0.08, 0.12, M.rack, 0, sy, D / 2));
      g.add(box(W, 0.04, D, M.darkSteel, 0, sy - 0.04, 0));
      for (let i = 0; i < 3; i++) {
        const w = Math.round((0.7 + Math.random() * 0.2) * 20) / 20, h = Math.round((0.4 + Math.random() * 0.3) * 20) / 20;
        g.add(rb(w, h, D * 0.7, 0.022, Math.random() < 0.5 ? M.card : M.card2, -W / 2 + 0.6 + i * 1.0, sy + h / 2, 0));
      }
    }
    return g;
  }
  rack(-4.6, -5.0); rack(-0.9, -5.0); rack(2.8, -5.0);

  /* conveyor belt along x at z=-4, pick end at x=+4 */
  const BELT = { z: -4.0, y: 0.55, x0: -6, x1: 4.4, w: 0.8 };
  {
    const len = BELT.x1 - BELT.x0, cxm = (BELT.x0 + BELT.x1) / 2;
    scene.add(box(len, 0.12, BELT.w, M.rubber, cxm, BELT.y, BELT.z));
    scene.add(box(len, 0.06, BELT.w + 0.08, M.steel, cxm, BELT.y - 0.12, BELT.z));
    for (let x = BELT.x0 + 0.4; x <= BELT.x1 - 0.2; x += 0.5) scene.add(cyl(0.07, 0.07, BELT.w + 0.06, M.darkSteel, x, BELT.y + 0.02, BELT.z, 10).rotateX(Math.PI / 2)); // rollers
    for (let x = BELT.x0 + 0.5; x <= BELT.x1 - 0.3; x += 1.6) { scene.add(cyl(0.05, 0.05, BELT.y - 0.06, M.steel, x, (BELT.y - 0.06) / 2, BELT.z - 0.3, 8)); scene.add(cyl(0.05, 0.05, BELT.y - 0.06, M.steel, x, (BELT.y - 0.06) / 2, BELT.z + 0.3, 8)); }
  }
  // decorative crates riding the belt
  const beltCrates = [];
  for (let i = 0; i < 5; i++) { const c = rb(0.5, 0.42, 0.5, 0.03, i % 2 ? M.card : M.card2, 0, 0, 0); c.userData.bx = BELT.x0 + i * 1.7; c.position.set(c.userData.bx, BELT.y + 0.27, BELT.z); scene.add(c); beltCrates.push(c); }

  /* pallet + hero crate (worker shuttles it) */
  function pallet(cx, cz) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
    for (let i = 0; i < 4; i++) g.add(box(1.0, 0.06, 0.1, M.wood, 0, 0.03, -0.4 + i * 0.27));
    for (const sx of [-0.42, 0, 0.42]) g.add(box(0.1, 0.08, 1.0, M.wood, sx, 0.10, 0));
    for (let i = 0; i < 4; i++) g.add(box(1.0, 0.04, 0.1, M.wood, 0, 0.15, -0.4 + i * 0.27)); return g;
  }
  pallet(4.5, -1.8); pallet(5.6, -1.8);
  // already-stacked crates on the 2nd pallet (set dressing)
  scene.add(rb(0.55, 0.45, 0.55, 0.035, M.card, 5.6, 0.4, -1.95)); scene.add(rb(0.55, 0.45, 0.55, 0.035, M.card2, 5.6, 0.4, -1.45));
  scene.add(rb(0.55, 0.45, 0.55, 0.035, M.card2, 5.6, 0.86, -1.7));
  const hero = rb(0.5, 0.42, 0.5, 0.03, M.wood, 4.0, BELT.y + 0.27, BELT.z); hero.userData.hold = { pos: [0.0, 0.15, 0.16], rot: [0, 0, 0] };
  scene.add(hero);

  /* machine consoles (worker B operates) */
  function console_(cx, cz) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = Math.PI; scene.add(g); // faces -z toward worker at smaller z
    g.add(rb(1.2, 1.0, 0.6, 0.06, M.panel, 0, 0.5, 0));
    g.add(box(1.1, 0.5, 0.06, M.screen, 0, 1.05, 0.28).translateZ(0)); g.add(rb(1.16, 0.62, 0.5, 0.05, M.darkSteel, 0, 1.1, -0.05));
    g.add(rb(1.0, 0.08, 0.5, 0.03, M.steel, 0, 0.96, 0.06)); // worktop
    return g;
  }
  console_(-3, 3.4); console_(1, 3.4);
  // a static forklift-ish block for flavor
  {
    const g = new THREE.Group(); g.position.set(-6.4, 0, 2.2); scene.add(g);
    g.add(rb(1.0, 0.7, 1.6, 0.07, M.beam, 0, 0.55, 0)); g.add(rb(0.9, 0.7, 0.8, 0.06, M.darkSteel, 0, 1.2, -0.3));
    g.add(box(0.1, 1.8, 0.1, M.steel, 0, 0.9, 0.85)); g.add(box(0.1, 1.8, 0.1, M.steel, -0.3, 0.9, 0.85));
    g.add(box(0.7, 0.06, 0.5, M.steel, -0.15, 0.2, 1.15));
    for (const [x, z] of [[-0.45, 0.6], [0.45, 0.6], [-0.45, -0.6], [0.45, -0.6]]) g.add(cyl(0.28, 0.28, 0.25, M.rubber, x, 0.28, z, 14).rotateZ(Math.PI / 2));
  }

  /* ceiling work lights (emissive + pointlight) */
  for (const [x, z] of [[-4, -2], [2, -2], [-2, 2], [4, 2]]) {
    scene.add(box(0.7, 0.08, 0.7, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 1 }), x, WH - 0.25, z));
    const pl = new THREE.PointLight(0xfff2d8, 2.4, 12, 2); pl.position.set(x, WH - 0.4, z); scene.add(pl);   // r128 intensity 0.3 → physical candela
  }

  /* ================= extra dressing ================= */
  // barrels
  {
    const cols = [M.blue, M.red, M.blue, M.beam]; [[6.7, 3.2], [7.15, 3.0], [6.95, 3.55], [7.25, 3.55]].forEach(([x, z], i) => {
      scene.add(cyl(0.26, 0.26, 0.9, cols[i % cols.length], x, 0.45, z, 14)); scene.add(cyl(0.27, 0.27, 0.04, M.darkSteel, x, 0.66, z, 14)); scene.add(cyl(0.27, 0.27, 0.04, M.darkSteel, x, 0.24, z, 14));
    });
  }
  // gas cylinders chained to the wall
  [[-7.4, -2.6], [-7.2, -2.4], [-7.4, -2.2]].forEach(([x, z]) => { scene.add(cyl(0.12, 0.12, 1.1, M.steel, x, 0.55, z, 12)); scene.add(cyl(0.07, 0.07, 0.13, M.darkSteel, x, 1.17, z, 10)); });
  // tool cart
  {
    const g = new THREE.Group(); g.position.set(5.7, 0, 1.7); scene.add(g);
    g.add(rb(0.72, 0.05, 0.5, 0.02, M.steel, 0, 0.72, 0)); g.add(rb(0.72, 0.05, 0.5, 0.02, M.steel, 0, 0.42, 0));
    for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) g.add(cyl(0.03, 0.03, 0.42, M.darkSteel, x, 0.21, z, 8));
    for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) g.add(cyl(0.06, 0.06, 0.04, M.rubber, x, 0.05, z, 10).rotateZ(Math.PI / 2));
    g.add(rb(0.14, 0.1, 0.3, 0.03, M.red, 0, 0.8, 0)); g.add(box(0.22, 0.05, 0.05, M.steel, -0.18, 0.76, 0.1)); g.add(box(0.05, 0.05, 0.22, M.steel, 0.2, 0.5, 0));
  }
  // safety cones marking a work zone
  [[2.6, 1.4], [3.2, 0.9], [-1.2, -1.4], [-0.4, -1.8]].forEach(([x, z]) => { scene.add(cone(0.14, 0.42, M.cone, x, 0.21, z, 12)); scene.add(box(0.32, 0.03, 0.32, M.cone, x, 0.02, z)); });
  // overhead pipes along the back wall
  for (const y of [3.4, 3.72]) { const p = cyl(0.07, 0.07, HX * 2 - 1, M.pipe, 0, y, -HZ + 0.28, 10); p.rotation.z = Math.PI / 2; scene.add(p); }
  for (const x of [-5, -1, 3]) scene.add(cyl(0.05, 0.05, 0.5, M.pipe, x, 3.55, -HZ + 0.28, 8));
  // wall-mounted warning sign
  scene.add(box(1.5, 0.55, 0.05, M.darkSteel, 2.5, 2.6, -HZ + 0.16));
  scene.add(box(1.3, 0.38, 0.02, new THREE.MeshStandardMaterial({ color: 0x161008, emissive: 0xffb023, emissiveIntensity: 0.8 }), 2.5, 2.6, -HZ + 0.19));
  // extra empty pallet stack
  { const g = new THREE.Group(); g.position.set(6.7, 0, -3.1); scene.add(g); for (let i = 0; i < 5; i++) g.add(box(1.0, 0.12, 1.0, M.wood, 0, 0.06 + i * 0.13, 0)); }

  /* moving robotic arm — articulated, cycles a pick-place at a station */
  function robotArm(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g);
    g.add(cyl(0.33, 0.4, 0.24, M.darkSteel, 0, 0.12, 0, 16));
    const col = new THREE.Group(); col.position.y = 0.24; g.add(col); col.add(cyl(0.2, 0.22, 0.52, M.rack, 0, 0.28, 0, 14));
    const seg1 = new THREE.Group(); seg1.position.y = 0.52; col.add(seg1);
    seg1.add(cyl(0.15, 0.15, 0.18, M.darkSteel, 0, 0, 0, 12).rotateX(Math.PI / 2)); seg1.add(rb(0.15, 0.82, 0.15, 0.05, M.rack, 0, 0.42, 0));
    const seg2 = new THREE.Group(); seg2.position.y = 0.82; seg1.add(seg2);
    seg2.add(cyl(0.12, 0.12, 0.15, M.darkSteel, 0, 0, 0, 12).rotateX(Math.PI / 2)); seg2.add(rb(0.12, 0.66, 0.12, 0.045, M.steel, 0, 0.33, 0));
    const j3 = new THREE.Group(); j3.position.y = 0.66; seg2.add(j3); j3.add(rb(0.17, 0.1, 0.2, 0.04, M.darkSteel, 0, 0.05, 0));
    j3.add(box(0.03, 0.16, 0.03, M.steel, -0.07, 0.17, 0.05)); j3.add(box(0.03, 0.16, 0.03, M.steel, 0.07, 0.17, 0.05));
    return { g, col, seg1, seg2, j3 };
  }
  const arm = robotArm(6.5, 0.4, Math.PI * 0.55);
  // arm's work pieces: a feed table + an output pallet
  scene.add(rb(0.7, 0.7, 0.7, 0.05, M.darkSteel, 7.0, 0.35, 1.6)); scene.add(rb(0.5, 0.4, 0.5, 0.04, M.card, 7.0, 0.9, 1.6));
  { const g = new THREE.Group(); g.position.set(5.4, 0, -0.6); scene.add(g); for (let i = 0; i < 2; i++) g.add(box(1.0, 0.12, 1.0, M.wood, 0, 0.06 + i * 0.13, 0)); g.add(rb(0.5, 0.4, 0.5, 0.04, M.card2, 0, 0.45, 0)); }
  function armTick(t) {
    const c = Math.cos(t * 0.9);
    arm.col.rotation.y = 0.7 * Math.sin(t * 0.9);
    arm.seg1.rotation.x = 0.5 + 0.45 * Math.sin(t * 0.9 + 0.6);
    arm.seg2.rotation.x = -1.1 - 0.35 * c;
    arm.j3.rotation.x = 0.4 * Math.sin(t * 1.3);
  }

  /* ================= actors ================= */
  const world = ActorWorld({
    scene,
    zone: { x0: -7.4, x1: 7.4, z0: -5.4, z1: 5.4 }, radius: 0.34, cell: 0.34, speed: 1.25,
    obstacles: [
      { x0: -6.2, x1: 4.5, z0: -4.5, z1: -3.5 },   // conveyor
      { x0: 3.9, x1: 6.2, z0: -2.4, z1: -1.2 },    // pallets
      { x0: -7.2, x1: 3.4, z0: -5.7, z1: -4.6 },   // back racks
      { x0: -3.8, x1: -2.2, z0: 3.0, z1: 4.0 },    // console 1
      { x0: 0.2, x1: 1.8, z0: 3.0, z1: 4.0 },      // console 2
      { x0: -7.2, x1: -5.4, z0: 1.2, z1: 3.2 },    // forklift
      { x0: 6.4, x1: 7.6, z0: 2.6, z1: 3.9 },      // barrels
      { x0: -7.7, x1: -6.9, z0: -2.9, z1: -2.0 },  // gas cylinders
      { x0: 5.2, x1: 6.2, z0: 1.3, z1: 2.1 },      // tool cart
      { x0: 5.7, x1: 7.6, z0: -0.8, z1: 2.0 },     // robotic arm + feed table
      { x0: 4.9, x1: 5.9, z0: -1.2, z1: 0.0 },     // arm output pallet
      { x0: 6.0, x1: 7.4, z0: -3.7, z1: -2.5 },    // pallet stack
    ],
  });

  // Worker A — shuttles the hero crate between the belt end and the pallet
  world.spawn({ kind: 'm', height: 1.8, x: 4.0, z: -2.6, tint: 0xe07b2a, routine: [
    { go: [4.0, -3.0] }, { grab: hero }, { go: [4.4, -0.7] }, { put: [4.5, 0.4, -1.8] }, { wait: 0.7, face: [4.5, -1.8] },
    { go: [4.4, -0.7] }, { grab: hero }, { go: [4.0, -3.0] }, { put: [4.0, 0.82, -4.0] }, { wait: 0.7, face: [4.0, -4] },
  ] });
  // Worker B — walks between the two consoles and operates each
  world.spawn({ kind: 'f', height: 1.7, x: -1, z: 1, tint: 0x2f6fae, routine: [
    { go: [-3, 2.6] }, { wait: 5, pose: 'operate', face: [-3, 4] }, { go: [1, 2.6] }, { wait: 5, pose: 'operate', face: [1, 4] },
  ] });
  // Two free-wandering workers for life
  world.spawn({ kind: 'm', height: 1.75, x: -2, z: -1, tint: 0x9aa0a6 });
  world.spawn({ kind: 'f', height: 1.68, x: 2, z: 1.5, tint: 0xc6502f });

  /* moving AGV — automated guided vehicle hauling a load on a fixed loop */
  function makeAGV() {
    const g = new THREE.Group(); scene.add(g);
    g.add(rb(1.1, 0.24, 1.5, 0.06, M.beam, 0, 0.2, 0)); g.add(box(1.0, 0.07, 1.4, M.darkSteel, 0, 0.35, 0));
    for (let i = 0; i < 3; i++) g.add(box(1.0, 0.04, 0.1, M.wood, 0, 0.41, -0.4 + i * 0.35));
    g.add(rb(0.82, 0.5, 0.9, 0.05, M.card, 0, 0.69, 0)); g.add(rb(0.66, 0.4, 0.5, 0.04, M.card2, 0, 1.14, 0.1));
    const beacon = box(0.12, 0.12, 0.12, new THREE.MeshStandardMaterial({ color: 0xffae00, emissive: 0xffae00, emissiveIntensity: 1.3 }), 0, 0.42, 0.72); g.add(beacon);
    function wheel(x, z) { const p = new THREE.Group(); p.position.set(x, 0.12, z); const c = cyl(0.12, 0.12, 0.08, M.rubber, 0, 0, 0, 12); c.rotation.z = Math.PI / 2; p.add(c); g.add(p); return p; }
    return { g, beacon, wheels: [wheel(-0.45, -0.5), wheel(0.45, -0.5), wheel(-0.45, 0.5), wheel(0.45, 0.5)], x: -5, z: 2, head: 0, wp: 0, r: 0.85 };
  }
  const AGV = makeAGV(); AGV.g.position.set(AGV.x, 0, AGV.z); world.addCollider(AGV); // people never penetrate the AGV; it yields too
  const AGV_PATH = [[-5, 2.2], [3, 2.2], [3, -2.6], [-5, -2.6]];
  function agvTick(dt) {
    const A = AGV, [tx, tz] = AGV_PATH[A.wp], dx = tx - A.x, dz = tz - A.z, d = Math.hypot(dx, dz);
    const fx = A.x + Math.sin(A.head) * 0.95, fz = A.z + Math.cos(A.head) * 0.95;   // yield briefly for a person ahead, then claim right-of-way
    if (world.actorsNear(fx, fz, 0.78)) {
      A.yieldT = (A.yieldT || 0) + dt;
      if (A.yieldT < 1.3) { A.beacon.material.emissiveIntensity = 2.6; A.g.position.set(A.x, 0, A.z); A.g.rotation.y = A.head; return; }
    } else A.yieldT = 0;
    A.beacon.material.emissiveIntensity = 1.3;
    if (d < 0.16) A.wp = (A.wp + 1) % AGV_PATH.length;
    else {
      const st = Math.min(d, 0.95 * dt); A.x += dx / d * st; A.z += dz / d * st; const want = Math.atan2(dx, dz);
      let hd = ((want - A.head + 9 * Math.PI) % (2 * Math.PI)) - Math.PI; A.head += hd * Math.min(1, 4 * dt); A.wheels.forEach((w) => { w.rotation.x += st * 8; });
    }
    A.g.position.set(A.x, 0, A.z); A.g.rotation.y = A.head;
  }

  /* ===================== r128-look shim ===================== */
  // The vr original was authored on three r128, whose pipeline fed raw hex values
  // to the shader and sRGB-encoded on output — every color rendered LIGHTER than
  // its hex. The pastel look was tuned on that pipeline. Reproduce it by mapping
  // each stored (linear) color through linear→sRGB once. Runs after ALL materials
  // exist (actors included). New-world code should NOT copy this — author true hex.
  scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      if (m.userData.__r128done) continue;
      m.userData.__r128done = true;
      m.color?.convertLinearToSRGB();
      m.emissive?.convertLinearToSRGB();
    }
  });
  scene.fog.color.convertLinearToSRGB();   // same reasoning as the materials above

  /* ================= loop ================= */
  let tt = 0;
  function renderFrame(dt) {
    tt += dt;
    // belt animation
    for (const c of beltCrates) { c.userData.bx += dt * 0.9; if (c.userData.bx > BELT.x1 - 0.3) c.userData.bx = BELT.x0; c.position.x = c.userData.bx; }
    world.tick(dt); agvTick(dt); armTick(tt);
    renderer.render(scene, camera);
  }

  return {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => orbit,
    renderFrame,
    resize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    },
    dispose() {
      renderer.dispose();
      _floorTex.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    },
  };
}
