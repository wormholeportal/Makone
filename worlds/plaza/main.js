// plaza — outdoor city square: pedestrians wander, one buys a coffee at the cart and sits
// on a bench; a fountain jets, pigeons hop, a delivery robot patrols, a car passes on the road.
// brief: a city square in the afternoon — the fountain, the pigeons, someone buying coffee, someone resting on a bench
// Ported from an earlier r128 prototype (kept verbatim except the r183 adaptation below)
// (three r128 globals → r183 ESM + WorldModule).
// Light intensities re-tuned for r183 physical units; cover.png is the color truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MK from '/runtime/solid.js';
import { World as ActorWorld, makeFigure } from '/runtime/actors.js';

export default async function createWorld(container) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.05, 400);
  camera.position.set(8.42, 8.75, 12.31);           // = the original ctl az .6 / el .5 / r 17 about (0,0.6,0)
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 0.6, 0);
  orbit.minDistance = 4; orbit.maxDistance = 40;
  orbit.minPolarAngle = Math.PI / 2 - 1.4; orbit.maxPolarAngle = Math.PI / 2 - 0.1;
  orbit.update();

  /* sky gradient as background + IBL */
  function skyTex() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#5b9be0'); g.addColorStop(0.5, '#9cc6ee'); g.addColorStop(0.78, '#d6e8f6'); g.addColorStop(1, '#eaf1ee');
    // NO SRGBColorSpace here: r128 fed authored canvases through as linear. See the r128-look shim.
    x.fillStyle = g; x.fillRect(0, 0, 16, 256); const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; return t;
  }
  const sky = skyTex(); scene.background = sky;
  { const p = new THREE.PMREMGenerator(renderer); scene.environment = p.fromEquirectangular(sky).texture; p.dispose(); }
  scene.fog = new THREE.Fog(0xc4d4e0, 60, 180);

  /* warm low sun → long soft shadows (r128 legacy intensities × π for physical units) */
  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x6e7d56, 2.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffeccf, 8.5); sun.position.set(-16, 13, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 0.5, far: 60 }); scene.add(sun);

  /* helpers */
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, s = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function sph(r, mat, x = 0, y = 0, z = 0, s = 12) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cone(r, h, mat, x = 0, y = 0, z = 0, s = 14) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  // rounded box (Manifold CSG); falls back to BoxGeometry if the kit is off
  function rb(w, h, d, r, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(MK.rbGeo(w, h, d, r), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  const M = {
    paving: new THREE.MeshStandardMaterial({ color: 0x9d9080, roughness: 0.95 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x55883a, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xa39a88, roughness: 0.85 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f7fb8, roughness: 0.1, metalness: 0.25, transparent: true, opacity: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5e34, roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2e373f, roughness: 0.5, metalness: 0.6 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5e3f26, roughness: 0.9 }),
    leafA: new THREE.MeshStandardMaterial({ color: 0x3f6e2e, roughness: 0.95 }),
    leafB: new THREE.MeshStandardMaterial({ color: 0x52803a, roughness: 0.95 }),
    cartRed: new THREE.MeshStandardMaterial({ color: 0xb12f24, roughness: 0.55 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe2d6bd, roughness: 0.7 }),
    parasol: new THREE.MeshStandardMaterial({ color: 0xcc3a2d, roughness: 0.7, side: THREE.DoubleSide }),
    porcelain: new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.35 }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x3c2414, roughness: 0.5 }),
    petal: new THREE.MeshStandardMaterial({ color: 0xdb5a96, roughness: 0.8 }),
    brick: new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 0.9 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x6e6248, roughness: 0.55, metalness: 0.55 }),
    robot: new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.45, metalness: 0.3 }),
    robotA: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.4, metalness: 0.4 }),
    bird: new THREE.MeshStandardMaterial({ color: 0x6b7178, roughness: 0.85 }),
    road: new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.92 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xb7ae9d, roughness: 0.9 }),
    line: new THREE.MeshStandardMaterial({ color: 0xd8c24a, roughness: 0.8 }),
    carA: new THREE.MeshStandardMaterial({ color: 0x356a9e, roughness: 0.4, metalness: 0.35 }),
    carB: new THREE.MeshStandardMaterial({ color: 0xb23a32, roughness: 0.4, metalness: 0.35 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.1, metalness: 0.4 }),
    dog: new THREE.MeshStandardMaterial({ color: 0xa6743f, roughness: 0.85 }),
    kiosk: new THREE.MeshStandardMaterial({ color: 0x4f7a6a, roughness: 0.7 }),
    awning: new THREE.MeshStandardMaterial({ color: 0xd6b24a, roughness: 0.7, side: THREE.DoubleSide }),
    balloonR: new THREE.MeshStandardMaterial({ color: 0xd8504a, roughness: 0.5 }),
    balloonB: new THREE.MeshStandardMaterial({ color: 0x4a86c8, roughness: 0.5 }),
    balloonY: new THREE.MeshStandardMaterial({ color: 0xe0b840, roughness: 0.5 }),
  };
  Object.values(M).forEach((m) => { m.envMapIntensity = 0.45; });   // keep bright sky as backdrop, not as flat fill
  const HX = 9, HZ = 7;
  await MK.init();   // refined rounded geometry; 9s timeout → plain-box fallback

  /* ground: paving + grass border + cross paths */
  function paveTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const s = 64;
    x.fillStyle = '#c3b9a8'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 176 + ((i * 7 + j * 5) % 10); x.fillStyle = `rgb(${v},${v - 8},${v - 20})`; x.fillRect(j * s + 2, i * s + 2, s - 4, s - 4); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 8); return t;
  }
  // plaza paving extended to the full road span (x ±14), reaching back to the road
  const paveMap = paveTex();
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(28, 15.4), new THREE.MeshStandardMaterial({ map: paveMap, roughness: 0.95 })); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, -0.7); f.receiveShadow = true; scene.add(f); }
  // grass corner beds
  function grassBed(x, z, w, d) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.grass); g.rotation.x = -Math.PI / 2; g.position.set(x, 0.01, z); g.receiveShadow = true; scene.add(g);
    scene.add(box(w, 0.12, 0.1, M.stone, x, 0.06, z - d / 2)); scene.add(box(w, 0.12, 0.1, M.stone, x, 0.06, z + d / 2)); scene.add(box(0.1, 0.12, d, M.stone, x - w / 2, 0.06, z)); scene.add(box(0.1, 0.12, d, M.stone, x + w / 2, 0.06, z));
  }
  grassBed(-6.5, -4.6, 4.2, 3.4); grassBed(6.5, -4.6, 4.2, 3.4); grassBed(-6.5, 4.6, 4.2, 3.4);

  /* central fountain */
  function dropTex() {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(206,232,244,0.6)'); gr.addColorStop(1, 'rgba(206,232,244,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  }
  const _dropTex = dropTex();
  function fountain() {
    const g = new THREE.Group(); scene.add(g); const R = 1.7;
    g.add(cyl(R, R, 0.5, M.stone, 0, 0.25, 0, 32));
    g.add(cyl(R, R - 0.18, 0.16, M.stone, 0, 0.55, 0, 32));         // rim
    const w = new THREE.Mesh(new THREE.CircleGeometry(R - 0.2, 40), M.water); w.rotation.x = -Math.PI / 2; w.position.y = 0.46; g.add(w);
    g.add(cyl(0.28, 0.34, 0.7, M.stone, 0, 0.85, 0, 18));         // pedestal
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), M.water); w2.rotation.x = -Math.PI / 2; w2.position.y = 1.18; g.add(w2);
    g.add(cyl(0.45, 0.5, 0.12, M.stone, 0, 1.12, 0, 20));
    // jetting water — GPU point spray, arcs up from the centre and falls back into the basin
    const N = 520, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), spawnY = 1.28;
    const reset = (i) => {
      const a = Math.random() * Math.PI * 2, out = 0.2 + Math.random() * 1.05;
      pos[i * 3] = Math.cos(a) * 0.05; pos[i * 3 + 1] = spawnY; pos[i * 3 + 2] = Math.sin(a) * 0.05;
      vel[i * 3] = Math.cos(a) * out; vel[i * 3 + 1] = 2.9 + Math.random() * 1.3; vel[i * 3 + 2] = Math.sin(a) * out;
    };
    for (let i = 0; i < N; i++) { reset(i); pos[i * 3 + 1] = spawnY + Math.random() * 1.5; vel[i * 3 + 1] -= Math.random() * 2.4; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.1, map: _dropTex, transparent: true, opacity: 0.85, color: 0xe2f1f9, depthWrite: false });
    g.add(new THREE.Points(geo, mat));
    return { g, w, w2, geo, pos, vel, reset, N };
  }
  const FT = fountain();
  function fountainTick(dt) {
    const F = FT; dt = Math.min(dt, 0.05);
    for (let i = 0; i < F.N; i++) {
      F.vel[i * 3 + 1] -= 6.8 * dt;
      F.pos[i * 3] += F.vel[i * 3] * dt; F.pos[i * 3 + 1] += F.vel[i * 3 + 1] * dt; F.pos[i * 3 + 2] += F.vel[i * 3 + 2] * dt;
      if (F.pos[i * 3 + 1] < 0.46) F.reset(i);
    }
    F.geo.attributes.position.needsUpdate = true;
  }

  /* bench: seat faces local -z (toward centre); place with rotY so -z points at fountain */
  function bench(cx, cz, rotY) {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = rotY; scene.add(g);
    for (let i = 0; i < 4; i++) g.add(rb(1.6, 0.06, 0.12, 0.028, M.wood, 0, 0.46, -0.18 + i * 0.12));   // seat slats
    for (let i = 0; i < 3; i++) g.add(rb(1.6, 0.10, 0.05, 0.024, M.wood, 0, 0.62 + i * 0.13, 0.22));     // backrest slats
    for (const sx of [-0.7, 0.7]) { g.add(rb(0.08, 0.46, 0.5, 0.03, M.metal, sx, 0.23, 0.04)); g.add(rb(0.08, 0.5, 0.06, 0.025, M.metal, sx, 0.7, 0.22)); }
    return g;
  }
  bench(0, 3.4, 0); bench(0, -3.4, Math.PI); bench(3.6, 0, Math.PI / 2); bench(-3.6, 0, -Math.PI / 2);

  /* trees */
  function tree(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    g.add(cyl(0.18, 0.24, 1.7, M.trunk, 0, 0.85, 0, 10));
    for (let i = 0; i < 7; i++) { const r = 0.7 + Math.random() * 0.5; g.add(sph(r, Math.random() < 0.5 ? M.leafA : M.leafB, (Math.random() - 0.5) * 1.3, 1.8 + Math.random() * 1.0, (Math.random() - 0.5) * 1.3)); }
    return g;
  }
  tree(-6.5, -4.6, 1.1); tree(6.5, -4.6, 1.0); tree(-6.5, 4.6, 1.15); tree(7.4, 4.2, 0.95); tree(-8, 1.5, 0.9); tree(8, -1.2, 0.9);

  /* lamp posts */
  function lamp(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(cyl(0.08, 0.1, 3.0, M.metal, 0, 1.5, 0, 10));
    g.add(sph(0.16, new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffe9b0, emissiveIntensity: 0.6 }), 0, 3.05, 0));
  }
  lamp(-2.6, 2.6); lamp(2.6, -2.6); lamp(2.6, 2.6); lamp(-2.6, -2.6);

  /* coffee cart at the +x/+z corner, with cups on the counter */
  const cart = new THREE.Group(); cart.position.set(5.4, 0, 4.6); cart.rotation.y = -Math.PI * 0.75; scene.add(cart);
  cart.add(rb(1.8, 0.9, 0.9, 0.07, M.cartRed, 0, 0.55, 0));
  cart.add(rb(1.9, 0.12, 1.0, 0.05, M.cream, 0, 1.02, 0));        // counter top
  cart.add(rb(1.8, 0.4, 0.06, 0.03, M.cream, 0, 1.25, -0.45));    // back board
  cart.add(cyl(0.02, 0.02, 2.0, M.metal, 0, 1.6, 0, 8));          // parasol pole
  const para = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 10), M.parasol); para.position.set(0, 2.7, 0); cart.add(para);
  for (const sx of [-0.7, 0.7]) { cart.add(cyl(0.28, 0.28, 0.6, M.metal, sx, 0.3, 0, 14).rotateZ(Math.PI / 2)); } // wheels
  cart.add(rb(0.5, 0.4, 0.4, 0.05, M.cream, 0.5, 1.3, 0));        // espresso machine
  cart.add(rb(0.3, 0.18, 0.3, 0.04, M.metal, -0.5, 1.18, 0.1));
  // a few display cups (static) + the hero cup the buyer takes
  function makeCup() {
    const g = new THREE.Group(); g.add(cyl(0.045, 0.036, 0.11, M.porcelain, 0, 0.055, 0, 16));
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), M.coffee); w.rotation.x = -Math.PI / 2; w.position.y = 0.108; g.add(w);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16, Math.PI), M.porcelain); h.rotation.set(0, 0, -Math.PI / 2); h.position.set(0.05, 0.06, 0); g.add(h);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g;
  }
  for (const dx of [-0.3, -0.15, 0.0]) {
    const c = makeCup(); c.position.set(5.4, 1.08, 4.6); c.translateX(0); scene.add(c);
    c.position.copy(cart.localToWorld(new THREE.Vector3(dx, 0.08, 0.3)));
  }
  const cup = makeCup(); cup.userData.hold = { pos: [0.0, 0.14, 0.14], rot: [0, 0, 0] };
  cup.position.copy(cart.localToWorld(new THREE.Vector3(0.25, 0.08, 0.32))); scene.add(cup);
  const cupBuyPos = cup.position.clone();

  /* ---- more set dressing ---- */
  function planter(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(cyl(0.36, 0.3, 0.5, M.stone, 0, 0.25, 0, 18)); g.add(cyl(0.34, 0.34, 0.06, M.brick, 0, 0.5, 0, 18));
    for (let i = 0; i < 12; i++) { const a = Math.random() * 7, r = Math.random() * 0.26; g.add(sph(0.08, Math.random() < 0.5 ? M.leafA : M.leafB, Math.cos(a) * r, 0.55 + Math.random() * 0.12, Math.sin(a) * r, 6)); }
    for (let i = 0; i < 7; i++) { const a = Math.random() * 7, r = Math.random() * 0.24; g.add(sph(0.045, M.petal, Math.cos(a) * r, 0.62 + Math.random() * 0.1, Math.sin(a) * r, 6)); }
  }
  planter(3.2, 5.7); planter(-3.2, 5.7); planter(0, -5.8);
  function bin(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(cyl(0.2, 0.17, 0.6, M.metal, 0, 0.3, 0, 14)); g.add(cyl(0.22, 0.22, 0.05, M.robotA, 0, 0.62, 0, 14)); g.add(cyl(0.16, 0.16, 0.04, M.robotA, 0, 0.66, 0, 14));
  }
  bin(1.7, -4.9); bin(-4.9, 2.6);
  // low clipped hedges (rounded) — replaced the crude bikes
  function hedge(x, z, w, d) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(rb(w, 0.55, d, 0.16, M.leafA, 0, 0.3, 0));
    const n = Math.floor(w * d * 5); for (let i = 0; i < n; i++) g.add(sph(0.13 + Math.random() * 0.06, Math.random() < 0.5 ? M.leafA : M.leafB, (Math.random() - 0.5) * w, 0.55 + Math.random() * 0.08, (Math.random() - 0.5) * d, 6));
  }
  hedge(-8.1, -3.2, 1.0, 2.0); hedge(8.1, 3.0, 1.0, 2.0);
  // bronze statue: a posed mannequin on a pedestal
  {
    const ped = new THREE.Group(); ped.position.set(-6.6, 0, 0); scene.add(ped);
    ped.add(rb(0.9, 0.9, 0.9, 0.05, M.stone, 0, 0.45, 0)); ped.add(cyl(0.4, 0.46, 0.12, M.brick, 0, 0.96, 0, 16));
    const st = makeFigure(scene, 'm', 1.7, { tint: 0x6e6248 }); st.grp.position.set(-6.6, 1.02, 0); st.grp.rotation.y = Math.PI / 2;
    const f = st.fig; f.l_arm.raise = 120; f.l_arm.straddle = 20; f.l_elbow.bend = 18; f.r_arm.raise = -20; f.r_arm.straddle = 12;
    f.r_leg.raise = -8; f.l_leg.raise = 10; f.torso.bend = -4; f.head.nod = 8;
    st.fig.traverse((m) => { if (m.isMesh) m.material.metalness = 0.5; });
  }

  /* ---- road behind the plaza + kiosk + balloons ---- */
  { const r = new THREE.Mesh(new THREE.PlaneGeometry(28, 2.8), M.road); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.004, -8.7); r.receiveShadow = true; scene.add(r); }
  scene.add(box(28, 0.16, 0.22, M.curb, 0, 0.08, -7.3));
  for (let x = -13; x <= 13; x += 1.7) scene.add(box(0.8, 0.02, 0.12, M.line, x, 0.02, -8.7));
  for (let i = 0; i < 6; i++) scene.add(box(0.28, 0.02, 2.4, new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.9 }), -1.5 + i * 0.6, 0.02, -8.7));
  // kiosk / newsstand at the right edge
  {
    const g = new THREE.Group(); g.position.set(7.7, 0, 2.6); g.rotation.y = -Math.PI / 2; scene.add(g);
    g.add(rb(1.6, 1.7, 1.2, 0.06, M.kiosk, 0, 0.85, 0)); g.add(box(1.5, 0.95, 0.06, M.glass, 0, 1.05, 0.6));
    g.add(rb(1.75, 0.1, 1.34, 0.05, M.wood, 0, 1.78, 0));
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.72), M.awning); aw.position.set(0, 1.5, 0.86); aw.rotation.x = 0.34; g.add(aw);
    for (let i = 0; i < 4; i++) g.add(box(0.22, 0.03, 0.3, [M.balloonR, M.balloonB, M.balloonY, M.petal][i], -0.5 + i * 0.33, 1.42, 0.42));
  }
  // balloon bunch — teardrop balloons with strings converging to a held knot
  const balloons = new THREE.Group(); balloons.position.set(-2.4, 0, -3.2); scene.add(balloons);
  const _knot = new THREE.Vector3(0, 0.55, 0), _strMat = new THREE.MeshStandardMaterial({ color: 0x767b80 });
  [[0, 2.35, 0, M.balloonR], [0.27, 2.16, 0.07, M.balloonB], [-0.25, 2.24, -0.07, M.balloonY], [0.13, 2.52, -0.15, M.balloonB], [-0.15, 2.56, 0.15, M.balloonR]].forEach(([x, y, z, c]) => {
    const b = new THREE.Group(); b.position.set(x, y, z);
    const ball = sph(0.16, c, 0, 0, 0, 16); ball.scale.set(0.92, 1.18, 0.92); b.add(ball);
    b.add(cone(0.05, 0.1, c, 0, -0.2, 0, 10));               // tied neck
    balloons.add(b);
    const tie = new THREE.Vector3(x, y - 0.24, z), dir = _knot.clone().sub(tie), len = dir.length();
    const s = cyl(0.005, 0.005, len, _strMat, 0, 0, 0, 4); s.position.copy(tie.clone().lerp(_knot, 0.5));
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); balloons.add(s);
  });

  /* ================= actors ================= */
  const world = ActorWorld({
    scene,
    zone: { x0: -8.6, x1: 8.6, z0: -6.6, z1: 6.6 }, radius: 0.34, cell: 0.34, speed: 1.15,
    obstacles: [
      { x0: -1.9, x1: 1.9, z0: -1.9, z1: 1.9 },   // fountain
      { x0: -0.9, x1: 0.9, z0: 3.0, z1: 3.8 },    // bench N
      { x0: -0.9, x1: 0.9, z0: -3.8, z1: -3.0 },  // bench S
      { x0: 3.0, x1: 3.8, z0: -0.9, z1: 0.9 },    // bench E
      { x0: -3.8, x1: -3.0, z0: -0.9, z1: 0.9 },  // bench W
      { x0: 4.3, x1: 6.5, z0: 3.5, z1: 5.7 },     // cart
      { x0: -7.5, x1: -5.5, z0: -5.6, z1: -3.6 }, // tree bed 1
      { x0: 5.5, x1: 7.5, z0: -5.6, z1: -3.6 },   // tree bed 2
      { x0: -7.5, x1: -5.5, z0: 3.6, z1: 5.6 },   // tree bed 3
      { x0: -7.2, x1: -6.0, z0: -0.6, z1: 0.6 },  // statue
      { x0: -8.6, x1: -7.6, z0: -4.2, z1: -2.2 }, // hedge L
      { x0: 7.6, x1: 8.6, z0: 2.0, z1: 4.0 },     // hedge R
      { x0: 2.8, x1: 3.6, z0: 5.3, z1: 6.1 },     // planter
      { x0: -3.6, x1: -2.8, z0: 5.3, z1: 6.1 },   // planter
      { x0: -0.4, x1: 0.4, z0: -6.2, z1: -5.4 },  // planter
      { x0: 6.9, x1: 8.6, z0: 1.6, z1: 3.6 },     // kiosk
      { x0: -2.75, x1: -2.05, z0: -3.5, z1: -2.9 }, // balloon stand
    ],
  });

  // Coffee buyer: go to cart, take a cup, sit on bench N, then return the cup. Loops.
  world.spawn({ kind: 'f', height: 1.68, x: -2, z: -2, tint: 0xca6b8a, routine: [
    { go: [4.4, 3.4] }, { face: [5.4, 4.6] }, { wait: 1.2 }, { grab: cup },
    { go: [0.2, 2.5] }, { sit: { x: 0.0, z: 3.46, yaw: Math.PI, hold: 7 } },
    { go: [4.4, 3.4] }, { put: [cupBuyPos.x, cupBuyPos.y, cupBuyPos.z] }, { wait: 1.0 },
  ] });
  // Two bench sitters (rest a while, stroll, repeat)
  world.spawn({ kind: 'm', height: 1.8, x: -3, z: 1, tint: 0x3f6f9c, routine: [
    { go: [-2.8, 0.0] }, { sit: { x: -3.62, z: 0.0, yaw: Math.PI / 2, hold: 9 } }, { go: [-5, 3] }, { wait: 2 },
  ] });
  world.spawn({ kind: 'm', height: 1.74, x: 2, z: -2, tint: 0x4a7a52, routine: [
    { go: [2.8, 0.0] }, { sit: { x: 3.62, z: 0.0, yaw: -Math.PI / 2, hold: 8 } }, { go: [5, -3] }, { wait: 2 },
  ] });
  // Free-wandering strollers
  world.spawn({ kind: 'f', height: 1.66, x: -5, z: -3, tint: 0xd9a441 });
  world.spawn({ kind: 'm', height: 1.78, x: 5, z: 2, tint: 0x8a8f96 });
  world.spawn({ kind: 'f', height: 1.63, x: 1, z: 5, tint: 0xb5664a });

  /* ================= moving objects ================= */
  // patrolling delivery robot — navigates the plaza on the same navmesh
  function makeRobot() {
    const g = new THREE.Group(); scene.add(g);
    g.add(rb(0.5, 0.46, 0.66, 0.08, M.robot, 0, 0.46, 0)); g.add(rb(0.46, 0.1, 0.62, 0.04, M.robotA, 0, 0.7, 0));
    g.add(cyl(0.2, 0.24, 0.14, M.robotA, 0, 0.8, 0, 16)); g.add(sph(0.22, M.robot, 0, 0.9, 0, 16));
    g.add(box(0.2, 0.1, 0.04, new THREE.MeshStandardMaterial({ color: 0x06222a, emissive: 0x36cfe0, emissiveIntensity: 1.3 }), 0, 0.93, 0.2));
    g.add(cyl(0.008, 0.008, 0.22, M.robotA, 0, 1.13, 0, 6)); g.add(sph(0.03, new THREE.MeshStandardMaterial({ color: 0xff5a4a, emissive: 0xff5a4a, emissiveIntensity: 1.2 }), 0, 1.26, 0));
    g.add(rb(0.4, 0.3, 0.5, 0.05, M.cartRed, 0, 0.42, 0.0)); // a parcel it's carrying
    function wheel(x) { const p = new THREE.Group(); p.position.set(x, 0.16, 0); const c = cyl(0.16, 0.16, 0.08, M.robotA, 0, 0, 0, 16); c.rotation.z = Math.PI / 2; p.add(c); g.add(p); return p; }
    return { g, wl: wheel(-0.27), wr: wheel(0.27), x: -7, z: 5, head: 0, speed: 0, path: null, pi: 0, timer: 0 };
  }
  const robot = makeRobot(); robot.g.position.set(robot.x, 0, robot.z);
  function robotTick(dt) {
    const R = robot, nav = world.nav;
    if (!R.path || R.pi >= R.path.length) {
      R.timer -= dt; R.speed += (0 - R.speed) * 0.12;
      if (R.timer <= 0) { const g = nav.randGoal(); R.path = nav.astar(R.x, R.z, g[0], g[1]) || null; R.pi = 1; R.timer = 2 + Math.random() * 3; }
    } else {
      const [tx, tz] = R.path[R.pi], dx = tx - R.x, dz = tz - R.z, d = Math.hypot(dx, dz);
      if (d < 0.13) R.pi++; else {
        R.speed += (1 - R.speed) * 0.07; const st = Math.min(d, 1.05 * R.speed * dt); R.x += dx / d * st; R.z += dz / d * st;
        const want = Math.atan2(dx, dz); let hd = ((want - R.head + 9 * Math.PI) % (2 * Math.PI)) - Math.PI; R.head += hd * Math.min(1, 6 * dt);
        R.wl.rotation.x += st * 7; R.wr.rotation.x += st * 7;
      }
    }
    R.g.position.set(R.x, 0, R.z); R.g.rotation.y = R.head;
  }

  // pigeons — hop around, occasionally short flights
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xd99a3a }), eyeMat = new THREE.MeshStandardMaterial({ color: 0x20262b });
  function makeBird(x, z) {
    const g = new THREE.Group(); scene.add(g);
    const body = sph(0.085, M.bird, 0, 0.1, 0, 10); body.scale.set(1.35, 1.0, 0.92); g.add(body);   // plump elongated body
    const tail = rb(0.13, 0.03, 0.07, 0.012, M.bird, -0.13, 0.11, 0); tail.rotation.z = 0.25; g.add(tail);
    g.add(sph(0.058, M.bird, 0.1, 0.17, 0, 8));                                                 // head
    g.add(cone(0.02, 0.06, beakMat, 0.16, 0.165, 0, 8).rotateZ(-Math.PI / 2));                   // beak (points +x)
    g.add(sph(0.011, eyeMat, 0.13, 0.19, 0.035, 6)); g.add(sph(0.011, eyeMat, 0.13, 0.19, -0.035, 6));
    return { g, x, sx: x, tx: x, z, sz: z, tz: z, p: 1, dur: 0.5, h: 0.1, face: 0 };
  }
  const birds = []; for (const [x, z] of [[1.6, 1.4], [-1.4, 1.7], [2.0, -1.2], [-1.8, -1.5], [0.4, 2.1]]) birds.push(makeBird(x, z));
  function birdTick(dt) {
    for (const b of birds) {
      b.p += dt / b.dur;
      if (b.p >= 1) {
        b.p = 0; b.sx = b.tx; b.sz = b.tz; const big = Math.random() < 0.22, a = Math.random() * 7, r = (big ? 2.0 : 0.45) * Math.random() + 0.12;
        b.tx = Math.max(-3.4, Math.min(3.4, b.sx + Math.cos(a) * r)); b.tz = Math.max(-3.4, Math.min(3.4, b.sz + Math.sin(a) * r));
        b.h = big ? 0.9 : 0.1; b.dur = big ? 1.0 : 0.45; b.face = Math.atan2(b.tx - b.sx, b.tz - b.sz);
      }
      const t = b.p, x = b.sx + (b.tx - b.sx) * t, z = b.sz + (b.tz - b.sz) * t, y = Math.sin(t * Math.PI) * b.h;
      b.g.position.set(x, y, z); b.g.rotation.y = b.face;
    }
  }

  // a car driving along the road
  function makeCar(mat) {
    const g = new THREE.Group(); scene.add(g);
    g.add(rb(2.4, 0.55, 1.05, 0.16, mat, 0, 0.5, 0)); g.add(rb(1.3, 0.5, 0.96, 0.14, mat, -0.05, 0.93, 0));
    g.add(rb(1.24, 0.42, 0.9, 0.1, M.glass, -0.05, 0.93, 0));
    g.add(box(0.1, 0.18, 0.86, new THREE.MeshStandardMaterial({ color: 0xffeaa6, emissive: 0xffe49a, emissiveIntensity: 0.7 }), 1.2, 0.5, 0));
    g.add(box(0.08, 0.16, 0.86, new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0xc0392b, emissiveIntensity: 0.5 }), -1.2, 0.5, 0));
    const wheels = []; for (const [x, z] of [[-0.8, -0.56], [0.8, -0.56], [-0.8, 0.56], [0.8, 0.56]]) { const w = new THREE.Group(); w.position.set(x, 0.26, z); const c = cyl(0.26, 0.26, 0.16, M.metal, 0, 0, 0, 14); c.rotation.x = Math.PI / 2; w.add(c); g.add(w); wheels.push(w); }
    return { g, wheels, x: -13, z: -8.7, dir: 1 };
  }
  // NOTE: the original registers no world.addCollider — the road (z −8.7) sits outside the
  // pedestrian zone (z0 −6.6) and the robot shares the navmesh, so nothing to carry over.
  const car = makeCar(M.carA);
  function carTick(dt) {
    const sp = 4.2; car.x += sp * dt * car.dir; if (car.x > 14) car.x = -14;
    car.g.position.set(car.x, 0, car.z); car.g.rotation.y = car.dir > 0 ? 0 : Math.PI; car.wheels.forEach((w) => { w.rotation.z -= sp * dt * 1.6; });
  }

  // a dog trotting around the plaza on the navmesh
  // (dog removed — read as unconvincing)

  // two more strollers
  world.spawn({ kind: 'm', height: 1.82, x: -4, z: 4, tint: 0x6a7a8a });
  world.spawn({ kind: 'f', height: 1.6, x: 3, z: -4, tint: 0xcaa24a });

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
  scene.fog.color.convertLinearToSRGB();

  /* ================= loop ================= */
  let tt = 0;
  function renderFrame(dt) {
    dt = Math.min(dt, 0.05); tt += dt;
    fountainTick(dt); FT.w.material.opacity = 0.84 + Math.sin(tt * 2.5) * 0.06;
    balloons.rotation.z = Math.sin(tt * 0.8) * 0.05;
    world.tick(dt); robotTick(dt); birdTick(dt); carTick(dt);
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
      sky.dispose(); _dropTex.dispose(); paveMap.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    },
  };
}
