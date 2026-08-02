// funpark — amusement park: carousel + ferris wheel + roller coaster with riders,
// crowd, stalls, balloons.
// brief: an afternoon fairground — the carousel turning, the wheel climbing slowly, the queue never quite still
// Ported from an earlier r128 prototype (kept verbatim except the r183 adaptation below) (three r128 globals → r183 ESM + WorldModule).
// Light intensities re-tuned for r183 physical units; the cover render is the color truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MK from '/runtime/solid.js';
import { World as ActorWorld, makeFigure, walkPose, sitPose } from '/runtime/actors.js';

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
  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.05, 500);

  /* warm afternoon sky + IBL */
  function skyTex() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#6aa6dd'); g.addColorStop(0.55, '#a9cde8'); g.addColorStop(0.82, '#e7d8c0'); g.addColorStop(1, '#f0e3cf');
    x.fillStyle = g; x.fillRect(0, 0, 16, 256);
    // NO SRGBColorSpace here: r128 treated authored canvases as linear (= the pale sky).
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; return t;
  }
  const sky = skyTex(); scene.background = sky;
  { const p = new THREE.PMREMGenerator(renderer); scene.environment = p.fromEquirectangular(sky).texture; p.dispose(); }
  scene.fog = new THREE.Fog(0xd8e0e6, 55, 150);
  const hemi = new THREE.HemisphereLight(0xcfe3f5, 0x6e6048, 2.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe8c4, 4.6); sun.position.set(-14, 16, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 20, bottom: -20, near: 0.5, far: 70 }); scene.add(sun);

  /* helpers */
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, s = 18) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function sph(r, mat, x = 0, y = 0, z = 0, s = 14) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cone(r, h, mat, x = 0, y = 0, z = 0, s = 18) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function torus(r, t, mat, x = 0, y = 0, z = 0, s = 32) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function rb(w, h, d, r, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(MK.rbGeo(w, h, d, r), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  const C = (h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.7 });
  const M = {
    grass: C(0x6aa048), path: new THREE.MeshStandardMaterial({ color: 0xc9b48f, roughness: 0.95 }),
    edge: C(0xb9ad97), wood: C(0x9a6a3c), metal: new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.4, metalness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.4 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc99a3e, roughness: 0.35, metalness: 0.7 }),
    red: C(0xd2473a), white: C(0xeee6da), blue: C(0x3f80c4), yellow: C(0xe6b53f), green: C(0x4f9a56), pink: C(0xde6f9a), teal: C(0x3aa2a0),
    horse: C(0xefe7da), horse2: C(0xb98a5a), saddle: C(0xb44638), tail: C(0x6b4a2e),
    trunk: C(0x6e4a2e), leafA: C(0x3f7a3a), leafB: C(0x57945a),
    bulb: new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffdf8a, emissiveIntensity: 0.9 }),
    carR: C(0xcf3b34), carB: C(0x2f6fae),
  };
  const RIDE_COL = [M.red, M.blue, M.yellow, M.green, M.pink, M.teal];
  Object.values(M).forEach((m) => { m.envMapIntensity = 0.5; });
  const HX = 15, HZ = 11;

  /* ground: grass + winding paths + plaza disc */
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), M.grass); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f); }
  function pathStrip(x, z, w, d) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.path); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); p.receiveShadow = true; scene.add(p); }
  pathStrip(0, 0, 5, HZ * 2);            // central avenue
  pathStrip(0, 2, HX * 2, 5);            // cross avenue
  { const d = new THREE.Mesh(new THREE.CircleGeometry(4, 40), M.path); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.012, 2); d.receiveShadow = true; scene.add(d); }

  /* a posed mannequin attached to a moving rig (not engine-driven) */
  function rider(kind, tint) { const { grp, fig } = makeFigure(scene, kind, 1.55 + Math.random() * 0.2, { tint }); scene.remove(grp); return { grp, fig }; }
  function sitRide(fig) { sitPose(fig, 1); fig.l_arm.raise = 20; fig.r_arm.raise = 20; fig.l_elbow.bend = 70; fig.r_elbow.bend = 70; }

  /* ===================== CAROUSEL ===================== */
  const CARO = { x: -6, z: -1.5 };
  function horse(matBody) {
    const g = new THREE.Group();
    g.add(rb(1.0, 0.44, 0.34, 0.15, matBody, 0, 0, 0));                 // torso (long)
    const neck = rb(0.24, 0.62, 0.24, 0.1, matBody, 0.48, 0.32, 0); neck.rotation.z = -0.62; g.add(neck);
    g.add(rb(0.4, 0.25, 0.22, 0.09, matBody, 0.76, 0.58, 0));           // head
    g.add(rb(0.2, 0.16, 0.16, 0.06, matBody, 0.96, 0.53, 0));           // muzzle
    g.add(cone(0.055, 0.17, matBody, 0.66, 0.78, 0.08, 6)); g.add(cone(0.055, 0.17, matBody, 0.66, 0.78, -0.08, 6)); // ears
    g.add(rb(0.08, 0.52, 0.23, 0.02, M.tail, 0.55, 0.48, 0));           // mane
    const tail = rb(0.08, 0.56, 0.14, 0.02, M.tail, -0.5, 0.02, 0); tail.rotation.z = 1.0; g.add(tail);
    // slightly splayed legs (prancing)
    const leg = (x, z, fwd) => { const p = new THREE.Group(); p.position.set(x, -0.18, z); p.rotation.x = fwd; p.add(rb(0.1, 0.72, 0.1, 0.045, matBody, 0, -0.36, 0)); g.add(p); };
    leg(0.36, 0.13, -0.32); leg(0.36, -0.13, -0.32); leg(-0.36, 0.13, 0.32); leg(-0.36, -0.13, 0.32);
    g.add(rb(0.46, 0.14, 0.44, 0.06, M.saddle, 0, 0.28, 0));            // saddle
    return g;
  }
  const carousel = new THREE.Group(); carousel.position.set(CARO.x, 0, CARO.z); scene.add(carousel);
  const caroSpin = new THREE.Group(); carousel.add(caroSpin);     // the rotating part
  caroSpin.add(cyl(3.2, 3.2, 0.4, M.white, 0, 0.45, 0, 40));           // platform
  caroSpin.add(cyl(3.3, 3.3, 0.12, M.red, 0, 0.71, 0, 40));            // rim trim
  caroSpin.add(cyl(0.18, 0.18, 5.2, M.brass, 0, 2.8, 0, 16));          // centre column
  const horses = [];
  const NHORSE = 8;
  for (let i = 0; i < NHORSE; i++) {
    const a = i / NHORSE * Math.PI * 2, R = 2.4;
    const arm = new THREE.Group(); arm.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); arm.rotation.y = -a + Math.PI / 2; caroSpin.add(arm);
    arm.add(cyl(0.04, 0.04, 3.6, M.brass, 0, 2.1, 0, 10));            // pole
    const h = horse(i % 2 ? M.horse : M.horse2); h.position.y = 1.5; arm.add(h);
    horses.push({ arm, h, base: 1.5, off: a });
  }
  // canopy (striped tent + scalloped fringe)
  const canopy = new THREE.Group(); canopy.position.y = 3.6; caroSpin.add(canopy);
  canopy.add(cone(2.0, 1.4, M.red, 0, 0.25, 0, 40));
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; canopy.add(cone(0.28, 0.42, i % 2 ? M.white : M.yellow, Math.cos(a) * 1.9, -0.42, Math.sin(a) * 1.9, 4).rotateX(Math.PI)); } // hanging fringe
  canopy.add(sph(0.24, M.brass, 0, 1.05, 0));

  /* ===================== FERRIS WHEEL ===================== */
  const FW = { x: 8, y: 5.2, z: -5.5, R: 4.4 };
  const ferris = new THREE.Group(); ferris.position.set(FW.x, FW.y, FW.z); scene.add(ferris);
  // A-frame supports + hub (static)
  for (const zz of [-1.1, 1.1]) {
    const a = new THREE.Group(); a.position.z = zz; ferris.add(a);
    a.add(cyl(0.13, 0.16, FW.y * 1.5, M.metal, -2.4, -FW.y * 0.62, 0, 10).rotateZ(0.5));
    a.add(cyl(0.13, 0.16, FW.y * 1.5, M.metal, 2.4, -FW.y * 0.62, 0, 10).rotateZ(-0.5));
  }
  ferris.add(cyl(0.16, 0.16, 2.6, M.dark, 0, 0, 0, 14).rotateX(Math.PI / 2));   // axle
  const wheel = new THREE.Group(); ferris.add(wheel);                    // rotating
  for (const zz of [-1.0, 1.0]) { wheel.add(torus(FW.R, 0.09, M.metal, 0, 0, zz, 40)); wheel.add(torus(FW.R * 0.5, 0.06, M.metal, 0, 0, zz, 28)); }
  const NGOND = 8, gondolas = [];
  for (let i = 0; i < NGOND; i++) {
    const a = i / NGOND * Math.PI * 2;
    for (const zz of [-1.0, 1.0]) wheel.add(cyl(0.04, 0.04, FW.R, M.metal, Math.cos(a) * FW.R / 2, Math.sin(a) * FW.R / 2, zz, 6).rotateZ(a + Math.PI / 2)); // spokes
    const piv = new THREE.Group(); piv.position.set(Math.cos(a) * FW.R, Math.sin(a) * FW.R, 0); wheel.add(piv);
    const g = new THREE.Group(); g.position.y = -0.5; piv.add(g);                  // gondola hangs below pivot
    const col = RIDE_COL[i % 6];
    g.add(rb(1.1, 0.12, 1.2, 0.05, col, 0, 0, 0));                       // floor
    g.add(rb(1.1, 0.5, 0.08, 0.04, col, 0, 0.3, -0.56));                 // back
    g.add(rb(0.08, 0.5, 1.2, 0.04, col, -0.55, 0.3, 0)); g.add(rb(0.08, 0.5, 1.2, 0.04, col, 0.55, 0.3, 0));
    g.add(cone(0.95, 0.4, M.white, 0, 0.95, 0, 4).rotateY(Math.PI / 4));  // roof
    if (i % 2 === 0) { const rd = rider(i % 2 ? 'm' : 'f', col.color.getHex()); sitRide(rd.fig); rd.grp.position.set(0, 0.06, 0.05); rd.grp.rotation.y = 0; g.add(rd.grp); }
    gondolas.push({ piv, g });
  }

  /* ===================== ROLLER COASTER ===================== */
  const cpts = [[8, 1.0, 7], [11.5, 2.6, 3.5], [12, 1.0, -1], [9.5, 3.6, -3.2], [5.5, 1.2, -2.6], [3, 3.0, 0.5], [3.6, 1.0, 4.5], [6, 1.6, 7.2]]
    .map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(cpts, true, 'catmullrom', 0.5);
  {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.09, 7, true), M.carR); tube.castShadow = true; scene.add(tube);
    const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.05, 6, true), M.metal); scene.add(tube2);
    // support pillars
    for (let i = 0; i < 28; i++) { const p = curve.getPointAt(i / 28); scene.add(cyl(0.06, 0.08, p.y, M.dark, p.x, p.y / 2, p.z, 7)); }
  }
  const train = []; const NCAR = 3;
  for (let i = 0; i < NCAR; i++) {
    const g = new THREE.Group(); scene.add(g);
    g.add(rb(0.8, 0.45, 0.66, 0.1, i === 0 ? M.carR : RIDE_COL[(i + 2) % 6], 0, 0.1, 0));
    g.add(rb(0.7, 0.18, 0.6, 0.06, M.dark, 0, 0.34, 0));
    if (i > 0) g.add(cone(0.18, 0.4, M.yellow, 0, 0.4, 0.34, 12)); else g.add(rb(0.4, 0.4, 0.3, 0.08, M.carR, 0, 0.32, 0.34)); // front nose
    const rd = rider(i % 2 ? 'f' : 'm', RIDE_COL[i % 6].color.getHex()); sitRide(rd.fig); rd.fig.l_arm.raise = 120; rd.fig.r_arm.raise = 120; rd.fig.l_elbow.bend = 20; rd.fig.r_elbow.bend = 20; rd.grp.position.set(0, 0.28, -0.05); g.add(rd.grp);
    train.push({ g, off: i * 0.018 });
  }

  /* ===================== STALLS / GATE / DRESSING ===================== */
  function awningStall(x, z, ry, col) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    g.add(rb(2.0, 1.05, 1.1, 0.06, M.wood, 0, 0.55, 0));               // body
    g.add(rb(2.1, 0.12, 1.2, 0.04, M.white, 0, 1.12, 0));              // counter top
    for (const sx of [-0.95, -0.32, 0.32, 0.95]) g.add(rb(0.18, 0.55, 0.18, 0.04, sx < 0 ? M.red : M.white, sx, 1.4, 0.62)); // striped valance
    const aw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.95), col); aw.position.set(0, 1.5, 0.7); aw.rotation.x = 0.4; g.add(aw);
    g.add(cyl(0.04, 0.04, 1.6, M.metal, -1.0, 0.8, 0.6, 8)); g.add(cyl(0.04, 0.04, 1.6, M.metal, 1.0, 0.8, 0.6, 8));
    return g;
  }
  awningStall(-2.6, 8.6, 0, M.red); awningStall(2.6, 8.6, 0, M.blue); awningStall(6.6, 2.0, -Math.PI / 2, M.yellow);
  // ticket gate (entrance)
  {
    const g = new THREE.Group(); g.position.set(0, 0, 10.2); scene.add(g);
    for (const sx of [-2.4, 2.4]) g.add(rb(0.5, 3.2, 0.5, 0.06, M.red, sx, 1.6, 0));
    g.add(rb(5.4, 0.7, 0.6, 0.08, M.yellow, 0, 3.4, 0));               // arch banner
    g.add(rb(5.0, 0.42, 0.04, 0.02, M.white, 0, 3.4, 0.32));
    for (let i = 0; i < 7; i++) g.add(sph(0.12, RIDE_COL[i % 6], -2.2 + i * 0.73, 3.85, 0, 8));
  }
  // balloon vendor (static figure + bunch)
  {
    const v = rider('m', 0x4f9a56); v.grp.position.set(4.6, v.grp.userData.footY, 8.6); v.grp.rotation.y = -2.2; scene.add(v.grp);
    walkPose(v.fig, 0, 0); v.fig.r_arm.raise = 58; v.fig.r_elbow.bend = 20;
    const bunch = new THREE.Group(); bunch.position.set(4.9, 0, 8.4); scene.add(bunch);
    const knot = new THREE.Vector3(0, 1.5, 0), sm = new THREE.MeshStandardMaterial({ color: 0x767b80 });
    [[0, 2.7, 0, M.red], [0.3, 2.5, 0.08, M.blue], [-0.28, 2.56, -0.08, M.yellow], [0.14, 2.85, -0.16, M.green], [-0.16, 2.9, 0.16, M.pink]].forEach(([x, y, z, c]) => {
      const b = new THREE.Group(); b.position.set(x, y, z); const ball = sph(0.18, c, 0, 0, 0, 14); ball.scale.set(0.92, 1.18, 0.92); b.add(ball); b.add(cone(0.05, 0.1, c, 0, -0.22, 0, 8)); bunch.add(b);
      const tie = new THREE.Vector3(x, y - 0.24, z), dir = knot.clone().sub(tie), len = dir.length(); const s = cyl(0.005, 0.005, len, sm, 0, 0, 0, 4); s.position.copy(tie.clone().lerp(knot, 0.5)); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); bunch.add(s);
    });
  }

  /* trees, benches, lamp posts, string lights */
  function tree(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    g.add(cyl(0.2, 0.28, 1.9, M.trunk, 0, 0.95, 0, 10));
    for (let i = 0; i < 7; i++) g.add(sph(0.8 + Math.random() * 0.5, Math.random() < 0.5 ? M.leafA : M.leafB, (Math.random() - 0.5) * 1.4, 2.0 + Math.random() * 1.1, (Math.random() - 0.5) * 1.4, 8));
  }
  tree(-13, 7, 1.2); tree(13, 7, 1.15); tree(-13, -6, 1.1); tree(12.5, 8.5, 1.0); tree(-11, -8, 1.0); tree(-2, -9, 0.95);
  function bench(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    for (let i = 0; i < 4; i++) g.add(rb(1.5, 0.06, 0.12, 0.028, M.wood, 0, 0.45, -0.18 + i * 0.12));
    for (let i = 0; i < 3; i++) g.add(rb(1.5, 0.1, 0.05, 0.024, M.wood, 0, 0.6, 0.22));
    for (const sx of [-0.65, 0.65]) { g.add(rb(0.08, 0.45, 0.5, 0.03, M.dark, sx, 0.22, 0.04)); g.add(rb(0.08, 0.5, 0.06, 0.025, M.dark, sx, 0.68, 0.22)); }
  }
  bench(-2, 4.6, 0); bench(2, 4.6, Math.PI); bench(-9, 1, Math.PI / 2); bench(9, 8, Math.PI);
  function lamp(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(cyl(0.1, 0.13, 3.2, M.dark, 0, 1.6, 0, 10)); g.add(sph(0.18, M.bulb, 0, 3.25, 0));
  }
  const lamps = [[-4, 5], [4, 5], [-4, -4], [4, -4], [0, 9.5]]; lamps.forEach(([x, z]) => lamp(x, z));
  // string lights between lamp tops
  function stringLights(a, b, sag) {
    const steps = 12; for (let i = 0; i <= steps; i++) {
      const t = i / steps; const y = 3.2 - Math.sin(t * Math.PI) * sag;
      scene.add(sph(0.06, M.bulb, a[0] + (b[0] - a[0]) * t, y, a[1] + (b[1] - a[1]) * t, 6));
    }
  }
  stringLights([-4, 5], [4, 5], 0.8); stringLights([4, 5], [4, -4], 0.8); stringLights([-4, 5], [-4, -4], 0.8); stringLights([4, -4], [-4, -4], 0.8);

  /* ===================== CROWD (engine) ===================== */
  const world = ActorWorld({
    scene,
    zone: { x0: -14, x1: 14, z0: -10, z1: 10 }, radius: 0.34, cell: 0.4, speed: 1.1,
    obstacles: [
      { x0: -9.5, x1: -2.5, z0: -5, z1: 2 },      // carousel
      { x0: 3.5, x1: 12.5, z0: -9.5, z1: -1.5 },  // ferris base
      { x0: 2, x1: 12.8, z0: -3.5, z1: 7.8 },     // coaster footprint
      { x0: -3.7, x1: -1.5, z0: 7.8, z1: 9.4 },   // stall L
      { x0: 1.5, x1: 3.7, z0: 7.8, z1: 9.4 },     // stall R
      { x0: 5.4, x1: 7.8, z0: 0.9, z1: 3.1 },     // stall side
      { x0: -2.9, x1: 2.9, z0: 9.4, z1: 11 },     // gate
    ],
  });
  world.spawn({ kind: 'f', height: 1.66, x: -1, z: 6, tint: 0xd98a8a, routine: [
    { go: [-2.6, 7.6] }, { face: [-2.6, 8.6] }, { wait: 1.5 }, { go: [0, 5] }, { sit: { x: -2, z: 4.6, yaw: 0, hold: 6 } }, { go: [3, 6] }, { wait: 1 }] });
  world.spawn({ kind: 'm', height: 1.8, x: 2, z: 6, tint: 0x5a7da0, routine: [
    { go: [2.6, 7.6] }, { face: [2.6, 8.6] }, { wait: 2, pose: 'operate' }, { go: [6, 5] }, { wait: 1 }] });
  // bench sitters + wanderers + a "mascot" (big bright round-headed figure)
  world.spawn({ kind: 'm', height: 1.74, x: 8, z: 7, tint: 0x6a8f5a, routine: [{ go: [8.7, 7.6] }, { sit: { x: 9, z: 8, yaw: Math.PI, hold: 9 } }, { go: [5, 4] }, { wait: 2 }] });
  world.spawn({ kind: 'f', height: 1.62, x: -7, z: 3, tint: 0xcaa24a });
  world.spawn({ kind: 'm', height: 1.78, x: 1, z: -3, tint: 0x8a8f96 });
  world.spawn({ kind: 'f', height: 1.6, x: 6, z: 4, tint: 0xb5664a });
  world.spawn({ kind: 'm', height: 1.7, x: -5, z: 6, tint: 0x9a6ab0 });
  world.spawn({ kind: 'm', height: 1.92, x: 0, z: 3, tint: 0xe24a7a });   // a tall bright "mascot" stroller

  /* ===================== moving-ride ticks ===================== */
  let tt = 0;
  function ridesTick(dt) {
    caroSpin.rotation.y += dt * 0.35;
    horses.forEach((h) => { h.h.position.y = h.base + Math.sin(tt * 2.4 + h.off * 3) * 0.18; });
    wheel.rotation.z += dt * 0.18;
    gondolas.forEach((g) => { g.piv.rotation.z = -wheel.rotation.z; });   // keep gondolas upright
    const u0 = (tt * 0.045) % 1;
    train.forEach((c) => {
      const u = (u0 + c.off) % 1; const p = curve.getPointAt(u), p2 = curve.getPointAt((u + 0.004) % 1);
      c.g.position.copy(p); c.g.lookAt(p2);
    });
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

  /* ===================== orbit controls ===================== */
  // equivalent of the vr page's hand-rolled ctl: t=(0,1.2,0) r=26 az=0.5 el=0.42
  camera.position.set(11.382, 11.802, 20.834);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 1.2, 0);
  orbit.minDistance = 6; orbit.maxDistance = 60;
  orbit.minPolarAngle = Math.PI / 2 - 1.4; orbit.maxPolarAngle = Math.PI / 2 - 0.08;
  orbit.update();

  /* ===================== loop ===================== */
  function renderFrame(dt) {
    tt += dt;
    world.tick(dt); ridesTick(dt);
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
      sky.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    },
  };
}
