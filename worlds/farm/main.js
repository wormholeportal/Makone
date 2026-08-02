// farm — smart greenhouse / vertical farm: harvesting robot arm on a rail, an autonomous
// rover, a packing line, pink-lit LED racks, a hovering drone and agronomists on their rounds.
// brief: a smart farm under glass — an arm picking, a rover on its rounds, racks of greens under pink light
// Ported from an earlier r128 prototype (kept verbatim except the r183 adaptation below) (three r128 globals → r183 ESM + WorldModule).
// Light intensities re-tuned for r183 physical units; the original cover.png is the color truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MK from '/runtime/solid.js';
import { World as ActorWorld, makeFigure, walkPose } from '/runtime/actors.js';

export default async function createWorld(container) {
  await MK.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe0d4);   // the pale mint the r128 page bg provided

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.90;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.05, 300);
  camera.position.set(11.34, 10.37, 16.58);        // = the r128 ctl at az 0.6 / el 0.42 / r 22
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 1.4, 0);
  orbit.minDistance = 5; orbit.maxDistance = 48;
  orbit.minPolarAngle = Math.PI / 2 - 1.4; orbit.maxPolarAngle = Math.PI / 2 - 0.08;
  orbit.update();

  /* bright diffuse greenhouse light + IBL */
  (function () {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#dfeef0'); g.addColorStop(.5, '#c2d6cb'); g.addColorStop(1, '#94a896');
    x.fillStyle = g; x.fillRect(0, 0, 32, 128); const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const p = new THREE.PMREMGenerator(renderer); scene.environment = p.fromEquirectangular(t).texture; t.dispose(); p.dispose();
  })();
  const hemi = new THREE.HemisphereLight(0xeaf4ee, 0x556048, 4.4); scene.add(hemi);   // r128 0.42: legacy ambient was scaled ~π²
  const sun = new THREE.DirectionalLight(0xfff4dc, 5.2); sun.position.set(-12, 18, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3.5;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 11, bottom: -11, near: 0.5, far: 50 }); scene.add(sun);

  /* helpers */
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, s = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function sph(r, mat, x = 0, y = 0, z = 0, s = 10) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cone(r, h, mat, x = 0, y = 0, z = 0, s = 14) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function rb(w, h, d, r, mat, x = 0, y = 0, z = 0) {
    const geo = MK.rbGeo(w, h, d, r);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
  }
  const C = (h, ro = 0.8) => new THREE.MeshStandardMaterial({ color: h, roughness: ro });
  const M = {
    floor: C(0x9aa0a2, 0.95), frame: new THREE.MeshStandardMaterial({ color: 0xc4cace, roughness: 0.4, metalness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xaeb4b8, roughness: 0.35, metalness: 0.6 }), dark: new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.5, metalness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xcfe6e4, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.1, side: THREE.DoubleSide }),
    vine: C(0x3f6e34, 0.9), leafA: C(0x4f8a3e, 0.92), leafB: C(0x6aa84d, 0.92), tomato: C(0xd23a2c, 0.5), tomatoG: C(0x8aa84a, 0.6),
    trough: C(0xdfe2e0, 0.7), soil: C(0x4a3a2c, 1), greens: C(0x6fb04a, 0.9), greensY: C(0xa6c24a, 0.9),
    led: new THREE.MeshStandardMaterial({ color: 0xd86aa0, emissive: 0xe05a9a, emissiveIntensity: 1.1, roughness: 0.4 }),
    rack: new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.4, metalness: 0.4 }),
    rover: new THREE.MeshStandardMaterial({ color: 0xe0b53f, roughness: 0.5, metalness: 0.2 }), crate: C(0xc88a4a, 0.85), bin: C(0x3f7a9c, 0.7),
    arm: new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.4, metalness: 0.2 }), armJ: new THREE.MeshStandardMaterial({ color: 0x2f6f9e, roughness: 0.4, metalness: 0.4 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.4, metalness: 0.5 }), tank: new THREE.MeshStandardMaterial({ color: 0x4f8a86, roughness: 0.5, metalness: 0.3 }),
    belt: C(0x23262b, 0.85), warn: C(0xe6b53f),
    leafD: C(0x356b2b, 0.9), tomatoO: C(0xe6622a, 0.5), truss: C(0x5f7e3a, 0.85),
    string: new THREE.MeshStandardMaterial({ color: 0xefece0, roughness: 0.7, transparent: true, opacity: 0.55 }),
    netpot: new THREE.MeshStandardMaterial({ color: 0x2c3033, roughness: 0.6, metalness: 0.2 }),
    droneBody: new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.45, metalness: 0.15 }),
    droneDark: new THREE.MeshStandardMaterial({ color: 0x32363c, roughness: 0.5, metalness: 0.45 }),
    rotorBlur: new THREE.MeshStandardMaterial({ color: 0x9097a0, roughness: 0.6, transparent: true, opacity: 0.26, depthWrite: false }),
    lens: new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.15, metalness: 0.5 }),
    ledGreen: new THREE.MeshStandardMaterial({ color: 0x0a2, emissive: 0x35e06a, emissiveIntensity: 1.4 }),
    ledRed: new THREE.MeshStandardMaterial({ color: 0xa20, emissive: 0xe0432c, emissiveIntensity: 1.4 }),
  };
  Object.values(M).forEach((m) => { m.envMapIntensity = 0.5; });
  const HX = 8, HZ = 6, WH = 4.0;

  /* soft sprite for mist */
  function softTex() {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.5, 'rgba(230,245,240,0.35)'); g.addColorStop(1, 'rgba(230,245,240,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  }
  const _soft = softTex();

  /* ===================== greenhouse shell (glass + steel frame), tidy rectangle ===================== */
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), M.floor); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f); }
  // painted lane lines
  { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, HZ * 1.9), M.warn); l.rotation.x = -Math.PI / 2; l.position.set(1.7, 0.012, 0); scene.add(l); }
  // clean greenhouse frame — strut() places a member correctly between two 3D points (no angle-math glitches)
  function strut(a, b, r, mat) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat); m.position.copy(va.clone().lerp(vb, 0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  }
  const RH = WH + 1.6, cor = [[-HX, -HZ], [HX, -HZ], [HX, HZ], [-HX, HZ]];
  cor.forEach(([x, z]) => strut([x, 0, z], [x, WH, z], 0.08, M.frame));                         // 4 corner posts
  for (let i = 0; i < 4; i++) { const a = cor[i], b = cor[(i + 1) % 4]; strut([a[0], WH, a[1]], [b[0], WH, b[1]], 0.06, M.frame); } // eave rails
  strut([0, RH, -HZ], [0, RH, HZ], 0.07, M.frame);                                           // ridge beam
  for (let z = -HZ; z <= HZ + 0.01; z += HZ / 2) { strut([HX, WH, z], [0, RH, z], 0.05, M.frame); strut([-HX, WH, z], [0, RH, z], 0.05, M.frame); } // rafters (5 bays)
  // glass: 4 side walls + 2 sloped roof panes (thin boxes are easy to orient cleanly)
  for (const sx of [-HX, HX]) scene.add(box(0.05, WH, HZ * 2, M.glass, sx, WH / 2, 0));
  for (const sz of [-HZ, HZ]) scene.add(box(HX * 2, WH, 0.05, M.glass, 0, WH / 2, sz));
  const _sl = Math.hypot(HX, RH - WH), _ang = Math.atan2(RH - WH, HX);
  {
    const gl = box(_sl, 0.05, HZ * 2, M.glass, -HX / 2, (WH + RH) / 2, 0); gl.rotation.z = _ang;
    const gr = box(_sl, 0.05, HZ * 2, M.glass, HX / 2, (WH + RH) / 2, 0); gr.rotation.z = -_ang;
    // (verbatim from the original: the two roof panes are built but never added — the r128
    //  reference render has an open roof, so adding them here would change the authored look)
  }

  /* ===================== tomato rows (vines + trellis + fruit) ===================== */
  const tomatoes = [];   // pickable fruit refs for the harvester
  const ROW_GAP = 0.95;   // center cross-walkway so people can move between aisles (navmesh stays connected)
  function tomatoRow(cx) {
    const g = new THREE.Group(); g.position.set(cx, 0, 0); scene.add(g);
    const seg = HZ * 1.8 / 2 - ROW_GAP, segC = ROW_GAP + seg / 2;                      // two planter segments leaving the walkway open
    for (const s of [-1, 1]) { g.add(rb(0.5, 0.22, seg, 0.05, M.trough, 0, 0.11, s * segC)); g.add(box(0.42, 0.06, seg, M.soil, 0, 0.24, s * segC)); }
    for (const sz of [-HZ + 0.7, -ROW_GAP - 0.3, ROW_GAP + 0.3, HZ - 0.7]) g.add(cyl(0.04, 0.04, 2.9, M.steel, 0, 1.45, sz, 6));
    for (const s of [-1, 1]) g.add(box(0.03, 0.03, seg, M.steel, 0, 2.85, s * segC));  // top wires (skip walkway)
    for (let z = -HZ + 1; z <= HZ - 1; z += 0.82) {
      if (Math.abs(z) < ROW_GAP) continue; const v = new THREE.Group(); v.position.set(0, 0, z); g.add(v);
      const lean = (Math.random() - 0.5) * 0.05;
      v.add(cyl(0.005, 0.005, 2.6, M.string, 0.0, 1.35, 0, 4));                            // high-wire support string
      const stem = cyl(0.04, 0.02, 2.45, M.vine, 0, 1.28, 0, 6); stem.rotation.z = lean; v.add(stem); // main stem (leaning)
      // leaf clusters at nodes — flattened blobs read as foliage, not bubbles
      for (let k = 0; k < 6; k++) {
        const y = 0.5 + k * 0.345, nl = 2 + (k % 2);
        for (let l = 0; l < nl; l++) {
          const ang = (l / nl) * Math.PI * 2 + k * 0.8;
          const lf = sph(0.13 + Math.random() * 0.05, k < 2 ? M.leafD : (Math.random() < 0.5 ? M.leafA : M.leafB), Math.cos(ang) * 0.2, y, Math.sin(ang) * 0.2, 7);
          lf.scale.set(1.0 + Math.random() * 0.3, 0.4 + Math.random() * 0.18, 1.0 + Math.random() * 0.3);
          lf.rotation.set(0.12 + Math.random() * 0.5, ang, lean + (Math.random() - 0.5) * 0.5); v.add(lf);
        }
      }
      // 2–3 fruit trusses hanging off the stem (clustered, mostly ripe)
      const nT = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let tI = 0; tI < nT; tI++) {
        const ty = 1.0 + tI * 0.62 + Math.random() * 0.15, tx = (Math.random() - 0.5) * 0.26, tz = (Math.random() - 0.5) * 0.26;
        v.add(cyl(0.012, 0.006, 0.2, M.truss, tx, ty, tz, 4));                              // truss stalk
        const nf = 3 + Math.floor(Math.random() * 3);
        for (let fI = 0; fI < nf; fI++) {
          const ripe = Math.random() < 0.72, mat = ripe ? (Math.random() < 0.35 ? M.tomatoO : M.tomato) : M.tomatoG;
          const ax = fI / nf * Math.PI * 2, fr = sph(0.06, mat, tx + Math.cos(ax) * 0.07, ty - 0.16 - (fI % 2) * 0.06, tz + Math.sin(ax) * 0.07, 8);
          v.add(fr); if (ripe) tomatoes.push(fr);
        }
      }
    }
    return g;
  }
  tomatoRow(-5.5); tomatoRow(-3.0); tomatoRow(-0.5);

  /* ===================== vertical LED racks (leafy greens under pink lights) ===================== */
  function ledRack(cx) {
    const g = new THREE.Group(); g.position.set(cx, 0, 0); scene.add(g); const W = 1.4, H = 4.0, D = HZ * 1.7;
    for (const sx of [-W / 2, W / 2]) for (const sz of [-D / 2, D / 2]) g.add(cyl(0.05, 0.05, H, M.rack, sx, H / 2, sz, 8));
    for (let i = 0; i < 4; i++) {
      const sy = 0.7 + i * 0.8;
      g.add(box(W, 0.06, D, M.rack, 0, sy, 0));                                 // tray shelf
      g.add(box(W - 0.12, 0.08, D - 0.08, M.netpot, 0, sy + 0.06, 0));               // NFT channel (dark grow trough)
      const cols = 2, step = 0.72, n = Math.floor((D - 0.5) / step);
      for (let a = 0; a < n; a++) for (let c = 0; c < cols; c++) {
        const base = ((a + c) % 2) ? M.greens : M.greensY;
        const h = new THREE.Group(); h.position.set((c - 0.5) * 0.6, sy + 0.12, -((n - 1) * step) / 2 + a * step); g.add(h);
        h.add(cyl(0.045, 0.034, 0.05, M.netpot, 0, 0, 0, 8));                    // net pot
        for (let l = 0; l < 6; l++) { const ang = l / 6 * 6.283; const lf = sph(0.058, base, Math.cos(ang) * 0.045, 0.04 + Math.random() * 0.015, Math.sin(ang) * 0.045, 5); lf.scale.set(1.3, 0.55, 1.3); lf.rotation.y = ang; h.add(lf); }
        h.add(sph(0.045, base, 0, 0.06, 0, 5));
      }                              // ruffled lettuce head
      g.add(box(W - 0.1, 0.05, D - 0.1, M.led, 0, sy + 0.7, 0));                      // pink LED bar under next tier
      const pl = new THREE.PointLight(0xe05a9a, 3.0, 3, 2); pl.position.set(0, sy + 0.5, 0); g.add(pl);   // r128 intensity 0.4 → physical candela
    }
    g.add(box(W, 0.07, D, M.rack, 0, 3.92, 0));                                  // top canopy — the top grow-light mounts under it (no floating board)
    for (const sz of [-D / 2, D / 2]) g.add(box(W, 0.08, 0.08, M.rack, 0, 3.96, sz));    // top end rails close off the frame
    return g;
  }
  ledRack(3.6); ledRack(5.6);

  /* ===================== harvesting robot arm on a rail (picks tomatoes) ===================== */
  const RAIL = { x: 0.8, z0: -HZ + 1, z1: HZ - 1 };
  scene.add(box(0.12, 0.12, HZ * 1.8, M.dark, RAIL.x, 0.06, 0));                  // floor rail
  scene.add(box(0.08, 0.08, HZ * 1.8, M.frame, RAIL.x, 2.9, 0));                  // top rail
  for (const zz of [-4, 0, 4]) scene.add(cyl(0.018, 0.018, 1.2, M.frame, RAIL.x, 3.5, zz, 6));   // hang the gantry rail from the frame (no floating rail)
  function harvArm() {
    const cart = new THREE.Group(); scene.add(cart);
    cart.add(rb(0.7, 0.3, 0.9, 0.05, M.rover, 0, 0.2, 0)); for (const [x, z] of [[-0.28, -0.32], [0.28, -0.32], [-0.28, 0.32], [0.28, 0.32]]) cart.add(cyl(0.1, 0.1, 0.08, M.dark, x, 0.1, z, 12).rotateZ(Math.PI / 2));
    cart.add(rb(0.42, 0.34, 0.42, 0.05, M.bin, 0, 0.5, 0.0));                    // collection bin
    const col = new THREE.Group(); col.position.set(-0.15, 0.36, 0); cart.add(col); col.add(cyl(0.12, 0.14, 0.5, M.armJ, 0, 0.25, 0, 12));
    const s1 = new THREE.Group(); s1.position.y = 0.5; col.add(s1); s1.add(cyl(0.1, 0.1, 0.12, M.dark, 0, 0, 0, 10).rotateX(Math.PI / 2)); s1.add(rb(0.1, 0.7, 0.1, 0.03, M.arm, 0, 0.35, 0));
    const s2 = new THREE.Group(); s2.position.y = 0.7; s1.add(s2); s2.add(cyl(0.08, 0.08, 0.1, M.dark, 0, 0, 0, 10).rotateX(Math.PI / 2)); s2.add(rb(0.08, 0.55, 0.08, 0.03, M.arm, 0, 0.28, 0));
    const grip = new THREE.Group(); grip.position.y = 0.56; s2.add(grip); grip.add(rb(0.12, 0.08, 0.14, 0.02, M.armJ, 0, 0.04, 0));
    grip.add(box(0.02, 0.12, 0.02, M.dark, -0.05, 0.14, 0.05)); grip.add(box(0.02, 0.12, 0.02, M.dark, 0.05, 0.14, 0.05));
    return { cart, col, s1, s2, grip };
  }
  const harv = harvArm();

  /* ===================== autonomous rover (hauls bins down the aisle) ===================== */
  function makeRover() {
    const g = new THREE.Group(); scene.add(g);
    g.add(rb(0.9, 0.34, 1.4, 0.08, M.rover, 0, 0.28, 0)); g.add(rb(0.8, 0.08, 1.3, 0.04, M.dark, 0, 0.47, 0));
    g.add(rb(0.7, 0.5, 0.8, 0.05, M.crate, 0, 0.7, 0)); g.add(rb(0.6, 0.06, 0.7, 0.02, M.crate, 0, 0.97, 0));
    for (let i = 0; i < 10; i++) g.add(sph(0.06, M.tomato, (Math.random() - 0.5) * 0.5, 0.78 + Math.random() * 0.1, (Math.random() - 0.5) * 0.6, 6)); // bin of tomatoes
    const beacon = box(0.1, 0.1, 0.1, new THREE.MeshStandardMaterial({ color: 0xffae00, emissive: 0xffae00, emissiveIntensity: 1.2 }), 0, 0.5, 0.72); g.add(beacon);
    function wheel(x, z) { const p = new THREE.Group(); p.position.set(x, 0.14, z); const c = cyl(0.14, 0.14, 0.08, M.dark, 0, 0, 0, 12); c.rotation.z = Math.PI / 2; p.add(c); g.add(p); return p; }
    return { g, beacon, wheels: [wheel(-0.4, -0.45), wheel(0.4, -0.45), wheel(-0.4, 0.45), wheel(0.4, 0.45)], x: 1.8, z: 4.5, head: 0, wp: 0, r: 0.78 };
  }
  const rover = makeRover(); rover.g.position.set(rover.x, 0, rover.z);
  const ROVER_PATH = [[2.4, 4.5], [2.4, -4.5], [1.8, -4.5], [1.8, 4.5]];   // loop in the open corridor only (crosses no plant rows)
  function roverTick(dt) {
    const A = rover, [tx, tz] = ROVER_PATH[A.wp], dx = tx - A.x, dz = tz - A.z, d = Math.hypot(dx, dz);
    // yield: brake for a person ahead, but only briefly — then claim right-of-way (people are nudged clear) so it never deadlocks
    const fx = A.x + Math.sin(A.head) * 0.9, fz = A.z + Math.cos(A.head) * 0.9;
    if (world.actorsNear(fx, fz, 0.72)) {
      A.yieldT = (A.yieldT || 0) + dt;
      if (A.yieldT < 1.3) { A.beacon.material.emissiveIntensity = 2.2; A.g.position.set(A.x, 0, A.z); A.g.rotation.y = A.head; return; }
    } else A.yieldT = 0;
    A.beacon.material.emissiveIntensity = 1.2;
    if (d < 0.18) A.wp = (A.wp + 1) % ROVER_PATH.length;
    else {
      const st = Math.min(d, 1.1 * dt); A.x += dx / d * st; A.z += dz / d * st; const want = Math.atan2(dx, dz);
      let hd = ((want - A.head + 9 * Math.PI) % (2 * Math.PI)) - Math.PI; A.head += hd * Math.min(1, 4 * dt); A.wheels.forEach((w) => { w.rotation.x += st * 7; });
    }
    A.g.position.set(A.x, 0, A.z); A.g.rotation.y = A.head;
  }

  /* ===================== packing station (conveyor + pick arm + crates) ===================== */
  const pack = new THREE.Group(); pack.position.set(7.3, 0, 4.2); pack.rotation.y = -Math.PI / 2; scene.add(pack);  // clear of the x5.6 rack so the pick-arm doesn't poke into it
  pack.add(box(2.6, 0.16, 0.7, M.belt, 0, 0.8, 0)); for (let x = -1.1; x <= 1.1; x += 0.34) pack.add(cyl(0.05, 0.05, 0.66, M.dark, x, 0.82, 0, 8).rotateX(Math.PI / 2));
  pack.add(rb(1.0, 0.8, 0.8, 0.05, M.frame, 1.5, 0.5, 0));                          // station body
  pack.add(rb(0.5, 0.42, 0.5, 0.04, M.crate, -1.1, 0.25, 1.0)); pack.add(rb(0.5, 0.42, 0.5, 0.04, M.crate, -1.1, 0.69, 1.0)); pack.add(rb(0.5, 0.42, 0.5, 0.04, M.crate, -0.5, 0.25, 1.05));
  // small pick arm over the conveyor
  const parm = (() => {
    const g = new THREE.Group(); g.position.set(0.4, 0.9, 0); pack.add(g);
    g.add(cyl(0.12, 0.14, 0.3, M.armJ, 0, 0.15, 0, 12)); const a = new THREE.Group(); a.position.y = 0.3; g.add(a);
    a.add(rb(0.08, 0.5, 0.08, 0.03, M.arm, 0, 0.25, 0)); const b = new THREE.Group(); b.position.y = 0.5; a.add(b); b.add(rb(0.06, 0.4, 0.06, 0.02, M.arm, 0, 0.2, 0));
    const tip = new THREE.Group(); tip.position.y = 0.4; b.add(tip); tip.add(cyl(0.05, 0.07, 0.08, M.dark, 0, 0, 0, 10));
    return { g, a, b, tip };
  })();

  /* ===================== mist particles ===================== */
  const mists = [];
  function mistAt(x, y, z, w, d) {
    const N = 30, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    const reset = (i) => { pos[i * 3] = x + (Math.random() - 0.5) * w; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z + (Math.random() - 0.5) * d; vel[i * 3] = (Math.random() - 0.5) * 0.04; vel[i * 3 + 1] = -0.04 - Math.random() * 0.05; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.04; };
    for (let i = 0; i < N; i++) { reset(i); pos[i * 3 + 1] = y - Math.random() * 0.8; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size: 0.16, map: _soft, transparent: true, opacity: 0.12, color: 0xeef6f0, depthWrite: false });
    scene.add(new THREE.Points(g, m)); mists.push({ g, pos, vel, reset, N, bot: y - 0.9, x, y, z, w, d });
  }
  function mistTick(dt) { dt = Math.min(dt, 0.05); for (const s of mists) { for (let i = 0; i < s.N; i++) { s.pos[i * 3] += s.vel[i * 3] * dt; s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt; s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt; if (s.pos[i * 3 + 1] < s.bot) s.reset(i); } s.g.attributes.position.needsUpdate = true; } }
  mistAt(-5.5, 2.6, 0, 0.5, HZ * 1.6); mistAt(-3.0, 2.6, 0, 0.5, HZ * 1.6); mistAt(-0.5, 2.6, 0, 0.5, HZ * 1.6);

  /* overhead irrigation pipes + water tank */
  for (const x of [-5.5, -3.0, -0.5]) {
    scene.add(cyl(0.05, 0.05, HZ * 1.9, M.pipe, x, 3.0, 0, 8).rotateX(Math.PI / 2));
    for (const zz of [-3.6, 0, 3.6]) scene.add(cyl(0.016, 0.016, 1.0, M.frame, x, 3.5, zz, 6));
  }   // hangers up to the eave (no floating pipe)
  scene.add(cyl(0.05, 0.05, 6.2, M.pipe, -2.8, 3.0, -HZ + 0.4, 8).rotateZ(Math.PI / 2));
  { const g = new THREE.Group(); g.position.set(7.2, 0, -4.8); scene.add(g); g.add(cyl(0.7, 0.7, 2.2, M.tank, 0, 1.1, 0, 18)); g.add(cyl(0.72, 0.72, 0.1, M.frame, 0, 0.2, 0, 18)); g.add(cone(0.75, 0.4, M.tank, 0, 2.4, 0, 18)); }

  /* ===================== people (engine) ===================== */
  const world = ActorWorld({
    scene,
    zone: { x0: -7.4, x1: 7.4, z0: -5.4, z1: 5.4 }, radius: 0.32, cell: 0.34, speed: 1.0,
    obstacles: [
      { x0: -5.9, x1: -5.1, z0: -5.6, z1: -ROW_GAP }, { x0: -5.9, x1: -5.1, z0: ROW_GAP, z1: 5.6 },
      { x0: -3.4, x1: -2.6, z0: -5.6, z1: -ROW_GAP }, { x0: -3.4, x1: -2.6, z0: ROW_GAP, z1: 5.6 },
      { x0: -0.9, x1: -0.1, z0: -5.6, z1: -ROW_GAP }, { x0: -0.9, x1: -0.1, z0: ROW_GAP, z1: 5.6 },  // tomato rows (center cross-walkway open)
      { x0: 2.9, x1: 7.9, z0: -5.6, z1: 5.6 },                                   // LED racks + packing + water tank (solid right side)
    ],
  });
  world.addCollider(rover);   // people never penetrate the moving rover (it also yields to them)
  // the harvesting cart slides along its rail — register it as a live collider too
  const harvCol = { x: RAIL.x, z: 0, r: 0.55 }; world.addCollider(harvCol);
  // agronomist inspecting a vine (operate), then moves to the next
  world.spawn({ kind: 'f', height: 1.66, x: -1.8, z: 2, tint: 0x4f8a5a, routine: [
    { go: [-1.8, 2] }, { wait: 5, pose: 'operate', face: [-0.5, 2] }, { go: [-4.2, -1] }, { wait: 5, pose: 'operate', face: [-3.0, -1] }, { go: [-1.8, 3] }, { wait: 1 }] });
  // worker carrying a crate from packing toward the rover lane
  const crate = rb(0.42, 0.32, 0.42, 0.04, M.crate, 0, 0, 0); crate.userData.hold = { pos: [0.0, 0.18, 0.18], rot: [0, 0, 0] }; crate.position.set(2.0, 0.4, 3.4); scene.add(crate);
  world.spawn({ kind: 'm', height: 1.8, x: 1.6, z: 1, tint: 0xc6a24a, routine: [
    { go: [2.0, 3.0] }, { grab: crate }, { go: [-1.8, -3] }, { put: [-2.0, 0.3, -3.2] }, { wait: 1 }, { go: [2.0, 3.0] }, { grab: crate }, { go: [2.0, 3.4] }, { put: [2.0, 0.4, 3.4] }, { wait: 1 }] });
  // two more strollers / inspectors
  world.spawn({ kind: 'm', height: 1.76, x: 1.7, z: -3, tint: 0x8a8f96 });
  world.spawn({ kind: 'f', height: 1.62, x: -2, z: -2, tint: 0x6fa0b0 });
  // packing operator (static, operate pose)
  const op = makeFigure(scene, 'm', 1.78, { tint: 0x3f7a9c }); op.grp.position.set(6.8, op.grp.userData.footY, 4.2); op.grp.rotation.y = Math.PI / 2;
  walkPose(op.fig, 0, 0); op.fig.torso.bend = 14; op.fig.l_arm.raise = 44; op.fig.r_arm.raise = 44; op.fig.l_arm.straddle = 10; op.fig.r_arm.straddle = 10; op.fig.l_elbow.bend = 70; op.fig.r_elbow.bend = 66; op.fig.head.nod = -12;

  /* hovering inspection drone — proper quadcopter */
  const drone = new THREE.Group(); scene.add(drone);
  function limb(parent, a, b, r, mat) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat); m.position.copy(va.clone().lerp(vb, 0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); m.castShadow = true; parent.add(m); return m;
  }
  drone.add(rb(0.26, 0.08, 0.36, 0.05, M.droneBody, 0, 0, 0));                                            // fuselage
  drone.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, 6.283, 0, Math.PI * 0.5), M.droneBody).translateY(0.03)); // dome
  drone.add(rb(0.3, 0.035, 0.1, 0.02, M.droneDark, 0, 0.05, -0.05));                                      // top spine
  drone.add(cyl(0.004, 0.004, 0.12, M.droneDark, 0.09, 0.12, -0.05, 4));                                  // antenna
  const gim = new THREE.Group(); gim.position.set(0, -0.05, 0.17); drone.add(gim);                        // gimbal camera
  gim.add(cyl(0.045, 0.045, 0.05, M.droneDark, 0, 0, 0, 12).rotateX(Math.PI / 2)); gim.add(sph(0.05, M.lens, 0, -0.02, 0.03, 12));
  const rotors = []; const C2 = 0.24;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = sx * C2, cz = sz * C2;
    limb(drone, [sx * 0.08, 0, sz * 0.08], [cx, 0.01, cz], 0.016, M.droneDark);                                 // diagonal arm
    drone.add(cyl(0.035, 0.042, 0.07, M.droneDark, cx, 0.05, cz, 12));                                     // motor pod
    const rg = new THREE.Group(); rg.position.set(cx, 0.1, cz); drone.add(rg);
    rg.add(cyl(0.02, 0.018, 0.02, M.droneBody, 0, 0, 0, 8));                                               // hub
    rg.add(box(0.3, 0.006, 0.024, M.droneDark, 0, 0.006, 0));                                             // 2-blade prop
    rg.add(cyl(0.16, 0.16, 0.004, M.rotorBlur, 0, 0.008, 0, 20));                                          // spin blur halo
    rotors.push(rg);
  }
  for (const sx of [-0.11, 0.11]) {
    limb(drone, [sx, -0.1, -0.16], [sx, -0.1, 0.16], 0.012, M.droneDark);        // landing skids
    limb(drone, [sx, -0.1, -0.1], [sx * 0.7, -0.02, -0.05], 0.01, M.droneDark);
    limb(drone, [sx, -0.1, 0.1], [sx * 0.7, -0.02, 0.05], 0.01, M.droneDark);
  }
  drone.add(sph(0.016, M.ledGreen, 0.1, -0.01, 0.19, 6)); drone.add(sph(0.016, M.ledGreen, -0.1, -0.01, 0.19, 6)); // nav LEDs
  drone.add(sph(0.016, M.ledRed, 0.1, -0.01, -0.19, 6)); drone.add(sph(0.016, M.ledRed, -0.1, -0.01, -0.19, 6));

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

  /* ===================== moving ticks ===================== */
  let tt = 0;
  function tick(dt) {
    // harvester: slide along rail (z), reach into the row, pick
    const z = Math.sin(tt * 0.25) * (HZ - 1.4); harv.cart.position.set(RAIL.x, 0, z); harvCol.z = z;
    harv.col.rotation.y = -0.2; harv.s1.rotation.x = 0.5 + 0.5 * Math.sin(tt * 1.3); harv.s2.rotation.x = -1.0 - 0.4 * Math.cos(tt * 1.3); harv.grip.rotation.x = 0.3 * Math.sin(tt * 1.6);
    // packing pick arm cycle
    parm.a.rotation.x = 0.4 + 0.5 * Math.sin(tt * 1.6); parm.b.rotation.x = -0.7 - 0.4 * Math.cos(tt * 1.6); parm.g.rotation.y = 0.5 * Math.sin(tt * 0.8);
    // packing operator — idle "working hands" motion so it isn't a frozen statue
    { const w = Math.sin(tt * 2.2) * 7; op.fig.l_elbow.bend = 70 + w; op.fig.r_elbow.bend = 66 - w; op.fig.torso.turn = 5 * Math.sin(tt * 1.1); op.fig.head.turn = 6 * Math.sin(tt * 0.7); }
    // LED rack subtle pulse
    M.led.emissiveIntensity = 1.0 + Math.sin(tt * 2) * 0.12;
    // drone hover over the rows
    drone.position.set(-3.0 + Math.sin(tt * 0.3) * 2.5, 3.3 + Math.sin(tt * 1.5) * 0.1, Math.cos(tt * 0.22) * 4); drone.rotation.y = tt * 0.4; rotors.forEach((r) => { r.rotation.y += dt * 40; });
    roverTick(dt); mistTick(dt);
  }

  /* ===================== loop ===================== */
  function renderFrame(dt) {
    tt += dt;
    world.tick(dt); tick(dt);
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
      _soft.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    },
  };
}
