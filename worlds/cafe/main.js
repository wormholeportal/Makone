// cafe — cozy street-corner café: waiter shuttles a tray, customers sip,
// barista works the machine, steam + ceiling fan + a car passing outside.
// brief: a corner café in the afternoon — warm light behind the glass, coffee steam, a car sliding past outside
// Ported from an earlier r128 prototype (kept verbatim except the r183 adaptation below) (three r128 globals → r183 ESM + WorldModule).
// Light intensities re-tuned for r183 physical units; original thumb is the color truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MK from '/runtime/solid.js';
import { World as ActorWorld, makeFigure, walkPose } from '/runtime/actors.js';

const HX = 4.6, HZ = 4.0, WH = 2.8;             // half-extents of the room + wall height

export default async function createWorld(container) {
  await MK.init();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcdbfa8);  // the warm daylight the r128 page bg provided

  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.03, 200);
  camera.position.set(5.3, 4.8, 6.3);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 1.1, 0);
  orbit.maxPolarAngle = Math.PI * 0.55;
  orbit.minDistance = 3; orbit.maxDistance = 22;
  orbit.update();

  /* warm interior IBL + daylight from the window + warm pendants */
  {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#cdd6df'); g.addColorStop(0.5, '#b3a690'); g.addColorStop(1, '#6b5742');
    x.fillStyle = g; x.fillRect(0, 0, 32, 128);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const p = new THREE.PMREMGenerator(renderer);
    scene.environment = p.fromEquirectangular(t).texture;
    t.dispose(); p.dispose();
  }
  const hemi = new THREE.HemisphereLight(0xeae0d0, 0x4a3f30, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.6);      // daylight from window side
  sun.position.set(-9, 7, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
  scene.add(sun);
  function pend(x, z) {                                        // r128 intensity 1.2 → physical candela
    const l = new THREE.PointLight(0xffc878, 9, 6.5, 2);
    l.position.set(x, 2.0, z); scene.add(l); return l;
  }

  /* helpers (kept from the vr original) */
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, s = 18) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function sph(r, mat, x = 0, y = 0, z = 0, s = 14) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cone(r, h, mat, x = 0, y = 0, z = 0, s = 18) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function rb(w, h, d, r, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(MK.rbGeo(w, h, d, r), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  const C = (h, ro = 0.7) => new THREE.MeshStandardMaterial({ color: h, roughness: ro });
  const M = {
    floor: C(0x5f3d1f, 0.5), wallC: C(0xd6c9af, 0.95), brick: C(0x2c544c, 0.9), trim: C(0x4a3019),
    wood: C(0x66421f), woodL: C(0x8a5f37), counter: new THREE.MeshStandardMaterial({ color: 0x282420, roughness: 0.3, metalness: 0.1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.3, metalness: 0.7 }), black: new THREE.MeshStandardMaterial({ color: 0x20232a, roughness: 0.4, metalness: 0.4 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc99a3e, roughness: 0.35, metalness: 0.7 }),
    white: C(0xf1ece2, 0.4), cream: C(0xe7dcc6), chalk: C(0x2c332e, 0.9),
    plant: C(0x4d7c43, 0.9), plant2: C(0x5f9150, 0.9), pot: C(0xb5764c, 0.85), terra: C(0xb15a3c),
    glass: new THREE.MeshStandardMaterial({ color: 0xbcd6e0, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.22 }),
    coffee: C(0x3a2417, 0.5), milk: C(0xf3ece0, 0.5), cake: C(0xe6c27a), berry: C(0xb23a55), leaf: C(0x6aa048, 0.95),
    asphalt: C(0x44474d, 0.95), sidewalk: C(0xb9b0a0, 0.95), carA: new THREE.MeshStandardMaterial({ color: 0x9a4b3c, roughness: 0.4, metalness: 0.3 }),
    cat: C(0x6a6258, 0.9), bulbWarm: new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd98a, emissiveIntensity: 0.9 }),
    menu: C(0x23282a, 0.9),
  };
  Object.values(M).forEach((m) => { m.envMapIntensity = 0.3; });

  /* soft round sprite (steam) */
  const _soft = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();

  /* ===================== room shell ===================== */
  const woodTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512;
    const x = c.getContext('2d');
    for (let i = 0; i < 14; i++) {
      x.fillStyle = `rgb(${98 - i % 3 * 12},${64 - i % 3 * 8},${34 - i % 3 * 5})`; x.fillRect(0, i * 37, 512, 37);
      x.strokeStyle = 'rgba(30,18,8,.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, i * 37); x.lineTo(512, i * 37); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    // NO SRGBColorSpace here: r128 treated this as linear (= brightened pale planks);
    // the authored look depends on it. See the r128-look shim at the bottom.
    return t;
  })();
  {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 }));
    f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  }
  scene.add(box(HX * 2, WH, 0.18, M.brick, 0, WH / 2, -HZ));      // back (brick)
  scene.add(box(0.18, WH, HZ * 2, M.wallC, HX, WH / 2, 0));       // right (cream)
  scene.add(box(HX * 2, 0.12, 0.12, M.trim, 0, 0.06, -HZ + 0.1)); // baseboard hint
  // left = window wall to the street (knee wall + big window + mullions)
  {
    const g = new THREE.Group(); g.position.set(-HX, 0, 0); scene.add(g);
    g.add(box(0.18, 0.85, HZ * 2, M.wallC, 0, 0.42, 0));
    g.add(box(0.18, 0.3, HZ * 2, M.wallC, 0, WH - 0.15, 0));
    for (const zz of [-HZ + 0.1, -2, 0, 2, HZ - 0.1]) g.add(box(0.12, 1.6, 0.1, M.wood, 0, 1.65, zz));
    g.add(box(0.06, 1.6, HZ * 2, M.glass, 0.02, 1.65, 0));
  }
  // hanging pendant lamps (warm)
  function pendant(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(cyl(0.01, 0.01, 0.7, M.black, 0, 2.45, 0, 6));
    g.add(cone(0.22, 0.26, M.black, 0, 2.05, 0, 18));
    g.add(sph(0.1, M.bulbWarm, 0, 1.98, 0));
    pend(x, z);
  }
  pendant(-1.5, 0.5); pendant(1.8, 0.5); pendant(0.2, -2.6);

  /* ===================== bar counter (back) ===================== */
  {
    const g = new THREE.Group(); g.position.set(0, 0, -3.1); scene.add(g);
    g.add(rb(6.0, 1.0, 0.7, 0.05, M.wood, -0.3, 0.5, 0));         // counter body
    g.add(rb(6.1, 0.09, 0.8, 0.04, M.counter, -0.3, 1.05, 0));    // dark stone top
    g.add(rb(6.0, 0.4, 0.05, 0.02, M.woodL, -0.3, 0.2, 0.36));    // front panel kick
    // espresso machine
    g.add(rb(0.9, 0.55, 0.5, 0.06, M.steel, -1.6, 1.38, -0.05));
    g.add(rb(0.86, 0.18, 0.46, 0.04, M.black, -1.6, 1.72, -0.05));
    g.add(cyl(0.05, 0.05, 0.18, M.brass, -1.85, 1.2, 0.2, 10));
    g.add(cyl(0.05, 0.05, 0.18, M.brass, -1.35, 1.2, 0.2, 10));   // group heads
    g.add(cyl(0.025, 0.025, 0.3, M.brass, -1.6, 1.55, 0.24, 8).rotateZ(0.5)); // steam wand
    // pastry case (glass dome over cakes)
    g.add(rb(1.2, 0.12, 0.5, 0.03, M.woodL, 0.9, 1.18, 0.05));
    for (let i = 0; i < 3; i++) g.add(cyl(0.13, 0.14, 0.1, [M.cake, M.berry, M.milk][i], 0.55 + i * 0.35, 1.29, 0.05, 16));
    g.add(box(1.2, 0.42, 0.5, M.glass, 0.9, 1.45, 0.05));
    // cash register + a few cups
    g.add(rb(0.34, 0.26, 0.3, 0.04, M.black, 2.0, 1.31, 0.05));
    for (let i = 0; i < 4; i++) g.add(cyl(0.05, 0.045, 0.09, M.white, -2.7 + i * 0.16, 1.14, 0.18, 12));
  }
  // back-bar shelves with cups, bottles, plants
  {
    const g = new THREE.Group(); g.position.set(0, 0, -3.85); scene.add(g);
    for (const sy of [1.5, 2.0, 2.5]) g.add(box(5.6, 0.05, 0.28, M.wood, -0.4, sy, 0));
    for (let i = 0; i < 10; i++) g.add(cyl(0.05, 0.045, 0.1, M.white, -2.9 + i * 0.32, 1.6, 0, 10));
    for (let i = 0; i < 7; i++) g.add(cyl(0.05, 0.05, 0.26, [M.berry, M.coffee, M.milk, M.cake][i % 4], -2.6 + i * 0.45, 2.15, 0, 10));
    g.add(cyl(0.1, 0.13, 0.18, M.pot, 1.8, 2.6, 0, 12));
    for (let i = 0; i < 6; i++) g.add(sph(0.1, M.plant, 1.8 + (Math.random() - 0.5) * 0.3, 2.75 + Math.random() * 0.15, (Math.random() - 0.5) * 0.2, 6));
  }
  // chalkboard menu
  scene.add(box(1.6, 1.0, 0.04, M.menu, 2.9, 1.9, -3.88));
  scene.add(box(1.7, 1.1, 0.04, M.wood, 2.9, 1.9, -3.9));
  for (let i = 0; i < 4; i++) scene.add(box(1.0, 0.04, 0.01, M.cream, 2.9, 2.25 - i * 0.22, -3.86));

  /* ===================== steam particles ===================== */
  const steams = [];
  function steamAt(x, y, z, amt) {
    const N = amt || 24, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const reset = (i) => {
      pos[i * 3] = x + (Math.random() - 0.5) * 0.05; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.05;
      vel[i * 3] = (Math.random() - 0.5) * 0.05; vel[i * 3 + 1] = 0.22 + Math.random() * 0.18; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    };
    for (let i = 0; i < N; i++) { reset(i); pos[i * 3 + 1] = y + Math.random() * 0.55; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size: 0.1, map: _soft, transparent: true, opacity: 0.18, color: 0xffffff, depthWrite: false });
    scene.add(new THREE.Points(g, m)); steams.push({ g, pos, vel, reset, N, top: y + 0.7 });
  }
  function steamTick(dt) {
    dt = Math.min(dt, 0.05);
    for (const s of steams) {
      for (let i = 0; i < s.N; i++) {
        s.pos[i * 3] += s.vel[i * 3] * dt; s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt; s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
        if (s.pos[i * 3 + 1] > s.top) s.reset(i);
      }
      s.g.attributes.position.needsUpdate = true;
    }
  }
  steamAt(-1.6, 1.85, -2.85, 14);    // espresso machine

  /* ===================== tables + chairs ===================== */
  const sitSpots = [];
  function chair(g, x, z, ry) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    c.add(rb(0.42, 0.05, 0.42, 0.03, M.woodL, 0, 0.46, 0));      // seat
    c.add(rb(0.42, 0.5, 0.05, 0.03, M.woodL, 0, 0.72, -0.18));   // back
    for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) c.add(cyl(0.022, 0.02, 0.46, M.wood, lx, 0.23, lz, 8));
  }
  function cup(mat) {
    const g = new THREE.Group();
    g.add(cyl(0.045, 0.036, 0.09, M.white, 0, 0.045, 0, 14));
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.038, 12), mat || M.coffee);
    w.rotation.x = -Math.PI / 2; w.position.y = 0.088; g.add(w);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 8, 14, Math.PI), M.white);
    h.rotation.set(0, 0, -Math.PI / 2); h.position.set(0.05, 0.05, 0); g.add(h);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.075, 14), M.white).rotateX(-Math.PI / 2));
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return g;
  }
  function table(cx, cz) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
    g.add(cyl(0.46, 0.46, 0.05, M.wood, 0, 0.72, 0, 28));        // round top
    g.add(cyl(0.06, 0.09, 0.72, M.wood, 0, 0.36, 0, 12));
    g.add(cyl(0.26, 0.3, 0.04, M.black, 0, 0.03, 0, 16));        // base
    const c1 = cup(M.coffee); c1.position.set(cx - 0.15, 0.745, cz - 0.1); scene.add(c1);
    const c2 = cup(M.milk); c2.position.set(cx + 0.16, 0.745, cz + 0.08); scene.add(c2);
    steamAt(cx - 0.15, 0.84, cz - 0.1, 18);
    chair(g, 0, -0.62, 0); chair(g, 0, 0.62, Math.PI);
    sitSpots.push({ x: cx, z: cz - 0.6, yaw: 0 }); sitSpots.push({ x: cx, z: cz + 0.6, yaw: Math.PI });
    return g;
  }
  table(-2.5, 0.6); table(1.0, 0.9); table(2.6, -1.0);

  /* a couple of plants + a framed art + a sleeping cat */
  function planter(x, z, big) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const s = big ? 1.3 : 1;
    g.add(cyl(0.22 * s, 0.18 * s, 0.5 * s, M.pot, 0, 0.25 * s, 0, 14));
    for (let i = 0; i < (big ? 12 : 8); i++) g.add(sph((0.13 + Math.random() * 0.07) * s, Math.random() < 0.5 ? M.plant : M.plant2, (Math.random() - 0.5) * 0.5 * s, (0.55 + Math.random() * 0.6) * s, (Math.random() - 0.5) * 0.5 * s, 7));
  }
  planter(3.9, 3.2, true); planter(-3.6, -3.3, false);
  scene.add(box(0.8, 0.6, 0.04, M.wood, HX - 0.02, 1.8, 1.8).rotateY(-Math.PI / 2));
  scene.add(box(0.66, 0.46, 0.02, M.berry, HX - 0.05, 1.8, 1.8).rotateY(-Math.PI / 2));
  // sleeping cat curled on a chair by the window
  {
    const g = new THREE.Group(); g.position.set(-3.4, 0.5, 1.6); g.rotation.y = 0.6; scene.add(g);
    g.add(sph(0.16, M.cat, 0, 0, 0, 12)); g.scale.set(1, 0.8, 1.3);
    g.add(sph(0.1, M.cat, 0.0, 0.05, 0.16, 10));
    g.add(cone(0.04, 0.07, M.cat, -0.04, 0.13, 0.16, 4)); g.add(cone(0.04, 0.07, M.cat, 0.04, 0.13, 0.16, 4));
    const tail = cyl(0.03, 0.015, 0.3, M.cat, -0.02, 0.0, -0.14, 6); tail.rotation.x = -1.2; g.add(tail);
  }

  /* ===================== street outside the window ===================== */
  {
    const g = new THREE.Group(); g.position.set(-HX - 0.1, 0, 0); scene.add(g);   // x < -HX is outside
    const side = new THREE.Mesh(new THREE.PlaneGeometry(3, HZ * 2), M.sidewalk);
    side.rotation.x = -Math.PI / 2; side.position.set(-1.5, 0.005, 0); side.receiveShadow = true; g.add(side);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6, HZ * 2), M.asphalt);
    road.rotation.x = -Math.PI / 2; road.position.set(-5.5, 0, 0); g.add(road);
    for (let z = -HZ + 0.5; z <= HZ - 0.5; z += 1.6) g.add(box(0.5, 0.02, 0.12, M.cream, -5.5, 0.02, z));
    g.add(cyl(0.09, 0.12, 3.2, M.black, -1.2, 1.6, -3, 10)); g.add(sph(0.16, M.bulbWarm, -1.2, 3.25, -3));
    const t = new THREE.Group(); t.position.set(-1.6, 0, 3); g.add(t);
    t.add(cyl(0.16, 0.2, 1.5, M.trim, 0, 0.75, 0, 10));
    for (let i = 0; i < 6; i++) t.add(sph(0.6, M.leaf, (Math.random() - 0.5) * 0.9, 1.7 + Math.random() * 0.7, (Math.random() - 0.5) * 0.9, 7));
  }
  // a passing car on the road (animated)
  const car = new THREE.Group(); scene.add(car);
  car.add(rb(1.0, 0.5, 2.2, 0.12, M.carA, 0, 0.5, 0));
  car.add(rb(0.95, 0.42, 1.2, 0.1, M.carA, 0, 0.9, -0.05));
  car.add(rb(0.9, 0.36, 1.1, 0.08, M.glass, 0, 0.9, -0.05));
  for (const [x, z] of [[-0.5, 0.7], [0.5, 0.7], [-0.5, -0.7], [0.5, -0.7]]) car.add(cyl(0.24, 0.24, 0.16, M.black, x, 0.24, z, 14).rotateZ(Math.PI / 2));
  car.position.set(-HX - 6.6, 0, -8);

  /* ===================== people ===================== */
  const world = ActorWorld({
    scene,
    zone: { x0: -4.0, x1: 4.2, z0: -2.5, z1: 3.6 }, radius: 0.3, cell: 0.3, speed: 1.0, separation: 0.5,
    obstacles: [
      { x0: -4.6, x1: 3.4, z0: -3.6, z1: -2.4 },   // counter
      { x0: -3.1, x1: -1.9, z0: 0.0, z1: 1.2 },    // table 1
      { x0: 0.4, x1: 1.6, z0: 0.3, z1: 1.5 },      // table 2
      { x0: 2.0, x1: 3.2, z0: -1.6, z1: -0.4 },    // table 3
      { x0: 3.3, x1: 4.6, z0: 2.6, z1: 3.8 },      // big planter
    ],
  });

  // a tray (board + cup) the waiter carries counter <-> table
  function makeTray() {
    const g = new THREE.Group();
    g.add(rb(0.34, 0.03, 0.26, 0.02, M.steel, 0, 0, 0));
    const c = cup(M.coffee); c.position.set(0, 0.02, 0); g.add(c);
    g.add(rb(0.18, 0.02, 0.14, 0.01, M.cake, 0.08, 0.02, 0.06));
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.userData.hold = { pos: [0.02, 0.2, 0.16], rot: [0, 0, 0] };
    return g;
  }
  const tray = makeTray();
  const trayCounter = { x: -0.6, y: 1.13, z: -2.75 };
  tray.position.set(trayCounter.x, trayCounter.y, trayCounter.z); scene.add(tray);
  const trayTable = { x: 1.0, y: 0.78, z: 0.9 };

  // waiter: pick the tray at counter, serve to table 2, clear it, repeat
  world.spawn({ kind: 'm', height: 1.78, x: 0, z: 1, tint: 0x3a4a5c, routine: [
    { go: [-0.6, -1.9] }, { face: [-0.6, -3] }, { wait: 0.8 }, { grab: tray },
    { go: [1.0, 2.0] }, { put: [trayTable.x, trayTable.y, trayTable.z] }, { wait: 1.2, face: [1.0, 0.9] },
    { go: [1.0, 2.0] }, { grab: tray }, { go: [-0.6, -1.9] }, { put: [trayCounter.x, trayCounter.y, trayCounter.z] }, { wait: 1.5 }] });
  // seated customers
  const S = sitSpots;
  world.spawn({ kind: 'f', height: 1.64, x: -2.5, z: 2.4, tint: 0xc77f8e, routine: [{ go: [S[0].x, S[0].z + 0.6] }, { sit: { x: S[0].x, z: S[0].z, yaw: S[0].yaw, hold: 14 } }, { go: [0, 3] }, { wait: 3 }] });
  world.spawn({ kind: 'm', height: 1.76, x: 2.6, z: 2.4, tint: 0x6a8f5a, routine: [{ go: [S[5].x, S[5].z - 0.6] }, { sit: { x: S[5].x, z: S[5].z, yaw: S[5].yaw, hold: 16 } }, { go: [0, 3] }, { wait: 3 }] });
  world.spawn({ kind: 'f', height: 1.6, x: 1.0, z: 2.6, tint: 0xcaa24a, routine: [{ go: [S[2].x, S[2].z + 0.6] }, { sit: { x: S[2].x, z: S[2].z, yaw: S[2].yaw, hold: 18 } }, { go: [-2, 3] }, { wait: 2 }] });
  // a customer who walks in & browses
  world.spawn({ kind: 'm', height: 1.82, x: 3, z: 3.4, tint: 0x8a8f96, routine: [{ go: [-0.6, -1.7] }, { face: [-0.6, -3] }, { wait: 3 }, { go: [3, 3] }, { wait: 2 }] });

  // barista (static, working the espresso machine behind the counter)
  {
    const { grp, fig } = makeFigure(scene, 'f', 1.66, { tint: 0xb86a4a });
    grp.position.set(-1.6, grp.userData.footY, -3.45); grp.rotation.y = 0;
    walkPose(fig, 0, 0);
    fig.torso.bend = 14; fig.l_arm.raise = 46; fig.r_arm.raise = 46;
    fig.l_arm.straddle = 10; fig.r_arm.straddle = 10;
    fig.l_elbow.bend = 72; fig.r_elbow.bend = 68;
    fig.l_fingers.bend = 40; fig.r_fingers.bend = 40; fig.head.nod = -12;
  }

  /* ===================== moving bits ===================== */
  const fan = new THREE.Group(); fan.position.set(0.2, 2.62, 0.2); scene.add(fan);
  fan.add(cyl(0.09, 0.09, 0.1, M.black, 0, 0, 0, 12));
  for (let i = 0; i < 4; i++) {
    const b = rb(0.7, 0.02, 0.14, 0.01, M.woodL, 0.42, 0, 0);
    const p = new THREE.Group(); p.rotation.y = i * Math.PI / 2; p.add(b); fan.add(p);
  }
  scene.add(cyl(0.012, 0.012, 0.18, M.black, 0.2, 2.71, 0.2, 6));

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

  /* ===================== loop ===================== */
  function renderFrame(dt) {
    world.tick(dt);
    fan.rotation.y += dt * 2.2;
    steamTick(dt);
    car.position.z += dt * 3.0;
    if (car.position.z > HZ + 1) car.position.z = -HZ - 1;
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
      _soft.dispose(); woodTex.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    },
  };
}
