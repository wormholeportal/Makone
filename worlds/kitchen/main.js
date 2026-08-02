// kitchen — robotic central kitchen: 5 arms (wok-toss / griddle-flip / pick / fry / plating)
// on a cadence line, plate conveyor, human↔robot ingredient handoff, fire + smoke + steam.
// brief: the back-of-house line running — toss, flip, grip, fry, plate, and a chef weaving through the middle
// Ported from an earlier r128 prototype (kept verbatim except the r183 adaptation below)
// (three r128 globals → r183 ESM + WorldModule).
// Light intensities re-tuned for r183 physical units; cover.png is the color truth.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MK from '/runtime/solid.js';
import { World as ActorWorld } from '/runtime/actors.js';

export default async function createWorld(container) {
  await MK.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x272b33);   // the dark slate the r128 page bg provided
  scene.fog = new THREE.Fog(0x1d2229, 24, 58);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, 0.05, 200);
  camera.position.set(6.73, 8.67, 10.82);           // = the original ctl az .5 / el .5 / r 16 about (0,1,-1.5)
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 1.0, -1.5);
  orbit.minDistance = 4; orbit.maxDistance = 32;
  orbit.minPolarAngle = Math.PI / 2 - 1.4; orbit.maxPolarAngle = Math.PI / 2 - 0.1;
  orbit.update();

  /* env IBL — cool stainless interior */
  {
    const c = document.createElement('canvas'); c.width = 32; c.height = 128; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#eef3f8'); g.addColorStop(.5, '#b7c0c9'); g.addColorStop(1, '#70777f');
    x.fillStyle = g; x.fillRect(0, 0, 32, 128); const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const p = new THREE.PMREMGenerator(renderer); scene.environment = p.fromEquirectangular(t).texture; t.dispose(); p.dispose();
  }

  /* lights — bright commercial kitchen (r128 legacy intensities × physical-unit factors) */
  const hemi = new THREE.HemisphereLight(0xeaf0f6, 0x4a4e53, 3.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e6, 4.2); sun.position.set(-9, 16, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 12, bottom: -12, near: 0.5, far: 46 }); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd6e4f2, 2.6); fill.position.set(8, 6, -7); scene.add(fill);

  /* helpers */
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, s = 18) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function sph(r, mat, x = 0, y = 0, z = 0, s = 14) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function cone(r, h, mat, x = 0, y = 0, z = 0, s = 18) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  function rb(w, h, d, r, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(MK.rbGeo(w, h, d, r), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
  const C = (h, ro = 0.7, me = 0) => new THREE.MeshStandardMaterial({ color: h, roughness: ro, metalness: me });
  const M = {
    tile: C(0xcfd4d9, 0.6), steel: new THREE.MeshStandardMaterial({ color: 0xb9bec3, roughness: 0.32, metalness: 0.72 }),
    steelD: new THREE.MeshStandardMaterial({ color: 0x8d9298, roughness: 0.4, metalness: 0.6 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3c424a, roughness: 0.5, metalness: 0.5 }),
    hood: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.78 }),
    armA: new THREE.MeshStandardMaterial({ color: 0xe7e9ec, roughness: 0.35, metalness: 0.5 }),   // white robot shell
    armJ: new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.45, metalness: 0.55 }),  // joints
    accent: new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.5, metalness: 0.3 }),  // brand blue accent
    rubber: C(0x1d2024, 0.85), cast: new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.3 }),
    wall: C(0xb6bcc1, 0.92), wallTile: C(0xe6ebf0, 0.5),
    plate: C(0xf2f4f6, 0.35), bowl: C(0xeef1f4, 0.4),
    screen: new THREE.MeshStandardMaterial({ color: 0x09151a, emissive: 0x32d6e6, emissiveIntensity: 1.0, roughness: 0.3 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x21262d, roughness: 0.5, metalness: 0.4 }),
    wood: C(0xb98a4e, 0.7), bin: C(0x2f6fae, 0.6),
    food_r: C(0xc8442c, 0.6), food_g: C(0x5c9a3e, 0.7), food_y: C(0xe0b53a, 0.6), food_o: C(0xdf7a25, 0.6), food_w: C(0xede6d6, 0.6),
    meat: C(0x9a4632, 0.6), rice: C(0xf0ece0, 0.55),
    emit: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 1 }),
    statusG: new THREE.MeshStandardMaterial({ color: 0x062, emissive: 0x36e070, emissiveIntensity: 1.4 }),
    oil: new THREE.MeshStandardMaterial({ color: 0xcaa23a, roughness: 0.25, metalness: 0.15 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff7a1a, emissiveIntensity: 1.6 }),
    broth: C(0x9a6a36, 0.4), ceil: C(0xe4e8ec, 0.92), copper: new THREE.MeshStandardMaterial({ color: 0xb9763f, roughness: 0.4, metalness: 0.6 }),
  };
  Object.values(M).forEach((m) => { m.envMapIntensity = 0.5; });
  const HX = 8, HZ = 5.5, WH = 4.0;

  /* ===================== room shell ===================== */
  function tileTex() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#cfd4d9'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(120,126,132,.5)'; x.lineWidth = 3; for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    for (let i = 0; i < 300; i++) { const g = 190 + Math.random() * 40; x.fillStyle = `rgba(${g},${g},${g},0.05)`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 7, 0, 7); x.fill(); }
    // NO SRGBColorSpace here: r128 fed authored canvases through as linear. See the r128-look shim.
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 6); return t;
  }
  const floorTex = tileTex();
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f); }
  function wallTileTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#e6ebf0'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(150,158,166,.55)'; x.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 3); return t;
  }
  const wallTex = wallTileTex();
  { const bw = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, WH), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.5 })); bw.position.set(0, WH / 2, -HZ); bw.receiveShadow = true; scene.add(bw); }
  scene.add(box(0.2, WH, HZ * 2, M.wall, -HX, WH / 2, 0));
  scene.add(box(0.2, WH, HZ * 2, M.wall, HX, WH / 2, 0));
  // ceiling-edge beams hugging side walls (structure without slashing the overview)
  for (let z = -HZ + 1.2; z <= HZ - 1.2; z += 2.4) { scene.add(box(0.5, 0.16, 0.14, M.darkSteel, -HX + 0.3, WH - 0.12, z)); scene.add(box(0.5, 0.16, 0.14, M.darkSteel, HX - 0.3, WH - 0.12, z)); }
  // ceiling panel (encloses the room — no dark void above the lights)
  { const c = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), M.ceil); c.rotation.x = Math.PI / 2; c.position.y = WH; c.receiveShadow = true; scene.add(c); }
  for (let x = -6; x <= 6; x += 4) { scene.add(box(0.3, 0.18, HZ * 2 - 1, M.steelD, x, WH - 0.1, 0)); }   // ceiling cross-runners

  /* ceiling work lights */
  for (const [x, z] of [[-4.5, -2], [0, -2], [4.5, -2], [-3, 2.2], [3, 2.2]]) {
    scene.add(box(0.8, 0.08, 0.8, M.emit, x, WH - 0.22, z));
    const pl = new THREE.PointLight(0xfff2d8, 6.0, 13, 2); pl.position.set(x, WH - 0.4, z); scene.add(pl);
  }

  /* ===================== particle systems (flame / smoke / steam) ===================== */
  function softTex() {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  }
  const _soft = softTex();
  const emitters = [];   // {pos,vel,life,age,N,reset,g,kind}
  function makeEmitter(opt) {
    const N = opt.N, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N), age = new Float32Array(N);
    const src = opt.src; // function returning {x,y,z}
    const reset = (i) => {
      const s = src(); pos[i * 3] = s.x + (Math.random() - 0.5) * opt.spread; pos[i * 3 + 1] = s.y + (Math.random() - 0.5) * opt.spread * 0.4; pos[i * 3 + 2] = s.z + (Math.random() - 0.5) * opt.spread;
      vel[i * 3] = (Math.random() - 0.5) * opt.drift; vel[i * 3 + 1] = opt.rise * (0.7 + Math.random() * 0.6); vel[i * 3 + 2] = (Math.random() - 0.5) * opt.drift;
      life[i] = opt.life * (0.6 + Math.random() * 0.8); age[i] = Math.random() * life[i];
    };
    for (let i = 0; i < N; i++) reset(i);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: opt.size, map: _soft, transparent: true, opacity: opt.opacity, color: opt.color, depthWrite: false,
      blending: opt.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    const e = { pos, vel, life, age, N, reset, g, mat, baseOp: opt.opacity, gust: opt.gust || 0 }; emitters.push(e); return e;
  }
  function emittersTick(dt) {
    dt = Math.min(dt, 0.05);
    for (const e of emitters) {
      for (let i = 0; i < e.N; i++) {
        e.age[i] += dt;
        if (e.age[i] >= e.life[i]) { e.reset(i); continue; }
        e.pos[i * 3] += e.vel[i * 3] * dt; e.pos[i * 3 + 1] += e.vel[i * 3 + 1] * dt; e.pos[i * 3 + 2] += e.vel[i * 3 + 2] * dt;
        e.vel[i * 3 + 1] += e.gust * dt;
      }
      e.g.attributes.position.needsUpdate = true;
    }
  }
  function flameAt(src) { return makeEmitter({ N: 48, src, spread: 0.16, drift: 0.16, rise: 2.0, life: 0.55, size: 0.55, opacity: 0.92, color: 0xff6a10, additive: true, gust: 0.7 }); }
  function emberAt(src) { return makeEmitter({ N: 18, src, spread: 0.1, drift: 0.5, rise: 2.6, life: 0.8, size: 0.08, opacity: 0.95, color: 0xffd166, additive: true, gust: 0.4 }); }
  function smokeAt(src) { return makeEmitter({ N: 34, src, spread: 0.2, drift: 0.22, rise: 0.9, life: 2.8, size: 0.8, opacity: 0.13, color: 0x8b9197, additive: false, gust: 0.05 }); }
  function steamAt(src) { return makeEmitter({ N: 22, src, spread: 0.08, drift: 0.08, rise: 0.55, life: 1.8, size: 0.32, opacity: 0.16, color: 0xffffff, additive: false, gust: 0.02 }); }
  function bubbleAt(src) { return makeEmitter({ N: 20, src, spread: 0.24, drift: 0.03, rise: 0.42, life: 0.55, size: 0.05, opacity: 0.55, color: 0xe8c45a, additive: false, gust: 0.0 }); }

  /* ===================== back cooking line: range + hood ===================== */
  const LZ = -4.2;            // station line z
  // continuous stainless range base across the back
  scene.add(rb(HX * 2 - 1.2, 0.9, 1.5, 0.05, M.steel, 0, 0.45, LZ));
  scene.add(rb(HX * 2 - 1.0, 0.06, 1.6, 0.03, M.steelD, 0, 0.93, LZ));   // top edge
  scene.add(rb(HX * 2 - 1.2, 0.42, 0.05, 0.02, M.steelD, 0, 0.22, LZ + 0.78)); // kick rail
  // exhaust hood overhead
  scene.add(box(HX * 2 - 0.6, 0.5, 2.4, M.hood, 0, 3.0, LZ - 0.1));
  scene.add(box(HX * 2 - 0.6, 0.7, 0.4, M.hood, 0, 2.55, LZ - 1.2).rotateX(-0.35)); // sloped front skirt
  for (let x = -6; x <= 6; x += 1.0) scene.add(box(0.5, 0.08, 0.5, new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.4, metalness: 0.6 }), x, 2.74, LZ + 0.7)); // baffle filters
  // warm under-hood strip light
  { const hl = new THREE.PointLight(0xfff0d0, 2.6, 8, 2); hl.position.set(0, 2.5, LZ + 0.2); scene.add(hl); }

  /* burner ring helper */
  function burner(x) {
    scene.add(cyl(0.34, 0.34, 0.04, M.cast, x, 0.95, LZ, 20)); scene.add(cyl(0.3, 0.3, 0.06, M.darkSteel, x, 0.98, LZ, 8));
    scene.add(cyl(0.12, 0.12, 0.05, M.cast, x, 1.0, LZ, 12));
  }

  /* ===================== robotic arm builder ===================== */
  function robotArm(x, z, ry, tool) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g);
    g.add(cyl(0.32, 0.4, 0.18, M.darkSteel, 0, 0.09, 0, 20));            // bolted base
    g.add(cyl(0.26, 0.28, 0.12, M.armJ, 0, 0.22, 0, 16));
    const col = new THREE.Group(); col.position.y = 0.28; g.add(col); col.add(cyl(0.2, 0.22, 0.5, M.armA, 0, 0.27, 0, 16));
    col.add(cyl(0.21, 0.21, 0.08, M.accent, 0, 0.5, 0, 16));            // accent band
    col.add(sph(0.022, M.statusG, 0.0, 0.46, -0.19, 6));               // live status light (faces the viewer)
    const seg1 = new THREE.Group(); seg1.position.y = 0.52; col.add(seg1);
    seg1.add(cyl(0.15, 0.15, 0.2, M.armJ, 0, 0, 0, 14).rotateX(Math.PI / 2)); seg1.add(rb(0.16, 0.86, 0.16, 0.05, M.armA, 0, 0.43, 0));
    const seg2 = new THREE.Group(); seg2.position.y = 0.86; seg1.add(seg2);
    seg2.add(cyl(0.12, 0.12, 0.16, M.armJ, 0, 0, 0, 14).rotateX(Math.PI / 2)); seg2.add(rb(0.13, 0.62, 0.13, 0.045, M.armA, 0, 0.31, 0));
    const j3 = new THREE.Group(); j3.position.y = 0.62; seg2.add(j3); j3.add(cyl(0.1, 0.1, 0.14, M.armJ, 0, 0.02, 0, 12).rotateX(Math.PI / 2));
    const wrist = new THREE.Group(); wrist.position.y = 0.08; j3.add(wrist);
    const grip = {};
    if (tool === 'wok') {
      const w = new THREE.Group(); w.position.y = 0.04; wrist.add(w);
      w.add(cyl(0.001, 0.34, 0.18, M.cast, 0, 0.06, 0, 22));            // wok bowl (cone-ish)
      w.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), M.cast).translateY(0.0));
      w.add(cyl(0.022, 0.022, 0.16, M.darkSteel, 0, 0.06, -0.32, 8).rotateX(Math.PI / 2)); // short handle stub to wrist
      grip.wok = w;
    } else if (tool === 'spatula') {
      wrist.add(rb(0.04, 0.34, 0.04, 0.01, M.darkSteel, 0, 0.16, 0));
      const blade = rb(0.22, 0.02, 0.26, 0.01, M.steel, 0, 0.32, 0.02); wrist.add(blade); grip.blade = blade;
    } else if (tool === 'gripper') {
      const base = cyl(0.09, 0.09, 0.1, M.armJ, 0, 0.06, 0, 12); wrist.add(base);
      const fL = box(0.03, 0.2, 0.06, M.darkSteel, -0.06, 0.2, 0); const fR = box(0.03, 0.2, 0.06, M.darkSteel, 0.06, 0.2, 0);
      wrist.add(fL); wrist.add(fR); grip.fL = fL; grip.fR = fR;
    } else if (tool === 'ladle') {
      wrist.add(rb(0.03, 0.3, 0.03, 0.01, M.darkSteel, 0, 0.15, 0));
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), M.steel); cup.position.y = 0.3; wrist.add(cup); grip.cup = cup;
    } else if (tool === 'basket') {
      wrist.add(rb(0.03, 0.32, 0.03, 0.01, M.darkSteel, 0, 0.16, 0));   // long handle
      const bk = new THREE.Group(); bk.position.y = 0.34; wrist.add(bk);
      bk.add(cyl(0.11, 0.085, 0.16, M.steelD, 0, 0, 0, 14)); bk.add(cyl(0.115, 0.115, 0.02, M.steel, 0, 0.08, 0, 14)); // wire basket + rim
      for (let i = 0; i < 6; i++) bk.add(box(0.02, 0.13, 0.02, M.food_y, (Math.random() - 0.5) * 0.12, 0.05, (Math.random() - 0.5) * 0.12)); // fries
      grip.basket = bk;
    }
    return { g, col, seg1, seg2, j3, wrist, grip };
  }

  /* ===================== STATION 1 — WOK TOSS ===================== */
  const WOK_X = -5.6;
  burner(WOK_X);
  const wokArm = robotArm(WOK_X, LZ + 0.55, Math.PI, 'wok');   // base in front of range, reaches back over burner
  flameAt(() => ({ x: WOK_X, y: 0.98, z: LZ }));
  emberAt(() => ({ x: WOK_X, y: 1.05, z: LZ }));
  smokeAt(() => ({ x: WOK_X, y: 1.5, z: LZ }));
  const wokGlow = new THREE.PointLight(0xff6a1a, 2.8, 5, 2); wokGlow.position.set(WOK_X, 1.2, LZ); scene.add(wokGlow);
  // tossing food bits inside the wok (rise on the toss beat)
  const wokBits = []; for (let i = 0; i < 7; i++) { const b = sph(0.045, [M.food_r, M.food_g, M.food_y, M.meat][i % 4], 0, 0, 0, 8); wokArm.grip.wok.add(b); wokBits.push({ m: b, a: Math.random() * 6.28 }); }
  function wokTick(t, beat) {
    const toss = Math.max(0, Math.sin(t * 2.4));               // periodic flick
    wokArm.seg1.rotation.x = 0.62 + 0.06 * Math.sin(t * 2.4);
    wokArm.seg2.rotation.x = -1.18 - 0.12 * toss;
    wokArm.j3.rotation.x = -0.35 * toss; wokArm.wrist.rotation.x = 0.5 * toss;            // wok tips forward = toss
    wokArm.col.rotation.y = 0.08 * Math.sin(t * 1.1);
    for (const b of wokBits) {
      b.a += 0.05; const h = toss > 0.6 ? (0.12 + 0.14 * Math.sin(t * 9 + b.a)) : 0.0;
      b.m.position.set(Math.cos(b.a) * 0.16, 0.05 + h, Math.sin(b.a) * 0.14);
    }
    wokGlow.intensity = (1.2 + 0.5 * Math.random() + 0.3 * toss) * 2.0;
  }

  /* ===================== STATION 2 — GRIDDLE FLIP ===================== */
  const GRD_X = -2.0;
  scene.add(rb(1.5, 0.04, 1.0, 0.02, M.cast, GRD_X, 0.95, LZ));        // flat-top griddle
  scene.add(rb(1.6, 0.06, 1.1, 0.02, M.darkSteel, GRD_X, 0.9, LZ));
  const grdArm = robotArm(GRD_X, LZ + 0.6, Math.PI, 'spatula');
  // patties on the griddle
  const patties = []; for (const [dx, dz] of [[-0.35, 0.1], [0.0, -0.15], [0.35, 0.12], [0.1, 0.3]]) { const p = cyl(0.13, 0.13, 0.05, M.meat, GRD_X + dx, 1.0, LZ + dz, 16); scene.add(p); patties.push(p); }
  steamAt(() => ({ x: GRD_X + (Math.random() - 0.5) * 1.0, y: 1.05, z: LZ + (Math.random() - 0.5) * 0.6 }));
  smokeAt(() => ({ x: GRD_X, y: 1.4, z: LZ }));
  function grdTick(t) {
    const s = Math.sin(t * 1.8), scoop = Math.max(0, s);
    grdArm.col.rotation.y = 0.5 * Math.sin(t * 0.9);                  // sweep across the griddle
    grdArm.seg1.rotation.x = 0.7 + 0.12 * s;
    grdArm.seg2.rotation.x = -1.25 - 0.18 * scoop;
    grdArm.wrist.rotation.x = -0.6 + 0.9 * scoop;                     // scoop-and-flip wrist roll
    if (grdArm.grip.blade) grdArm.grip.blade.rotation.x = 0.2 * scoop;
  }

  /* ===================== STATION 3 — PICK / GRIP + human handoff ===================== */
  const PICK_X = 1.6;
  // ingredient bins on the range (robot picks from the near bin)
  scene.add(rb(0.6, 0.34, 0.6, 0.04, M.bin, PICK_X, 1.1, LZ - 0.2));
  scene.add(rb(0.6, 0.34, 0.6, 0.04, C(0x2f9e6e, 0.6), PICK_X + 0.72, 1.1, LZ - 0.2));
  const pickArm = robotArm(PICK_X, LZ + 0.7, Math.PI, 'gripper');
  // a small pile of "ingredients" the gripper transfers onto the belt
  function makeNugget() { return sph(0.06, [M.food_o, M.food_g, M.food_r, M.food_w][Math.floor(Math.random() * 4)], 0, 0, 0, 8); }
  let pickPhase = 0, heldNugget = null;
  function pickTick(t) {
    // cycle: down to bin (close) -> up -> over belt (open). period ~ matches belt cadence
    const ph = (t * 0.62) % (Math.PI * 2); const down = Math.max(0, Math.sin(ph));
    pickArm.col.rotation.y = -0.55 + 0.45 * Math.cos(ph * 0.5);         // swing bin <-> belt
    pickArm.seg1.rotation.x = 0.5 + 0.25 * down;
    pickArm.seg2.rotation.x = -1.0 - 0.45 * down;
    const close = down > 0.5 ? 0.04 : 0.0;                              // fingers pinch when low at the bin
    if (pickArm.grip.fL) { pickArm.grip.fL.position.x = -0.06 + close; pickArm.grip.fR.position.x = 0.06 - close; }
  }

  /* ===================== STATION 4 — PLATING on the conveyor ===================== */
  const PLATE_X = 5.0;
  const ladleArm = robotArm(PLATE_X, LZ + 0.7, Math.PI, 'ladle');
  // rice/sauce reservoir bowl beside it
  scene.add(cyl(0.26, 0.22, 0.28, M.steel, PLATE_X - 0.6, 1.12, LZ - 0.1, 18));
  scene.add(cyl(0.24, 0.2, 0.04, M.rice, PLATE_X - 0.6, 1.27, LZ - 0.1, 18));
  steamAt(() => ({ x: PLATE_X - 0.6, y: 1.3, z: LZ - 0.1 }));

  /* ===================== extra back-line stations (line density) ===================== */
  // stock pot — between wok & griddle
  function stockPot(x) {
    scene.add(cyl(0.36, 0.34, 0.52, M.steel, x, 1.22, LZ, 22));
    scene.add(cyl(0.39, 0.39, 0.05, M.steelD, x, 1.49, LZ, 22)); scene.add(cyl(0.32, 0.32, 0.02, M.broth, x, 1.47, LZ, 20));
    scene.add(cyl(0.035, 0.035, 0.26, M.darkSteel, x - 0.42, 1.32, LZ, 8).rotateZ(Math.PI / 2));   // pot handle
    burner(x); steamAt(() => ({ x: x + (Math.random() - 0.5) * 0.3, y: 1.55, z: LZ }));
  }
  stockPot(-3.8);
  // steamer stack — between griddle & pick
  function steamer(x) {
    for (let i = 0; i < 3; i++) scene.add(cyl(0.3, 0.3, 0.2, M.steelD, x, 1.05 + i * 0.21, LZ, 22));
    scene.add(cyl(0.31, 0.27, 0.09, M.steel, x, 1.05 + 3 * 0.21, LZ, 22));   // domed lid
    burner(x); steamAt(() => ({ x: x + (Math.random() - 0.5) * 0.45, y: 1.8, z: LZ }));
  }
  steamer(-0.2);
  // deep fryer + a 5th arm lowering a fry basket
  const FRY_X = 3.3;
  scene.add(rb(0.72, 0.42, 0.92, 0.04, M.steelD, FRY_X, 1.1, LZ));
  scene.add(rb(0.74, 0.06, 0.94, 0.03, M.steel, FRY_X, 1.32, LZ));
  scene.add(rb(0.6, 0.03, 0.8, 0.02, M.oil, FRY_X, 1.3, LZ));            // hot-oil surface
  const fryArm = robotArm(FRY_X, LZ + 0.62, Math.PI, 'basket');
  bubbleAt(() => ({ x: FRY_X, y: 1.28, z: LZ })); steamAt(() => ({ x: FRY_X, y: 1.5, z: LZ }));
  function fryTick(t) {
    const dip = Math.max(0, Math.sin(t * 0.7));
    fryArm.seg1.rotation.x = 0.45 + 0.18 * dip; fryArm.seg2.rotation.x = -0.85 - 0.55 * dip; fryArm.wrist.rotation.x = 0.15 * dip;
  }

  /* ===================== CONVEYOR — plates flowing left→right under plating ===================== */
  const BELT = { z: -2.2, y: 0.62, x0: -7.2, x1: 7.2, w: 0.9 };
  {
    const len = BELT.x1 - BELT.x0, cxm = (BELT.x0 + BELT.x1) / 2;
    scene.add(rb(len, 0.1, BELT.w, 0.03, M.rubber, cxm, BELT.y, BELT.z));
    scene.add(box(len, 0.34, BELT.w + 0.12, M.steel, cxm, BELT.y - 0.28, BELT.z));
    scene.add(box(len, 0.06, BELT.w + 0.16, M.steelD, cxm, BELT.y - 0.06, BELT.z));
    for (let x = BELT.x0 + 0.4; x <= BELT.x1 - 0.2; x += 0.5) scene.add(cyl(0.06, 0.06, BELT.w + 0.04, M.darkSteel, x, BELT.y + 0.06, BELT.z, 10).rotateX(Math.PI / 2));
    for (let x = BELT.x0 + 0.8; x <= BELT.x1 - 0.4; x += 2.0) { scene.add(cyl(0.05, 0.05, BELT.y - 0.45, M.steelD, x, (BELT.y - 0.45) / 2, BELT.z - 0.34, 8)); scene.add(cyl(0.05, 0.05, BELT.y - 0.45, M.steelD, x, (BELT.y - 0.45) / 2, BELT.z + 0.34, 8)); }
  }
  // plates riding the belt; get "plated" with food as they pass the ladle arm
  const SPACING = 1.8, BSPEED = 0.85;
  function makePlate() {
    const g = new THREE.Group();
    g.add(cyl(0.2, 0.17, 0.035, M.plate, 0, 0.02, 0, 22)); g.add(cyl(0.16, 0.16, 0.012, M.plate, 0, 0.045, 0, 20));
    g.userData.plated = false; g.userData.food = new THREE.Group(); g.add(g.userData.food);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g;
  }
  const plates = [];
  for (let i = 0; i < 8; i++) { const p = makePlate(); p.userData.bx = BELT.x0 + i * SPACING; p.position.set(p.userData.bx, BELT.y + 0.06, BELT.z); scene.add(p); plates.push(p); }
  function platePlate(p) {
    p.userData.plated = true; const f = p.userData.food; const kind = Math.floor(Math.random() * 3);
    if (kind === 0) { // rice bowl + toppings
      f.add(cyl(0.11, 0.11, 0.05, M.rice, 0, 0.07, 0, 16));
      f.add(sph(0.05, M.meat, 0.07, 0.1, 0.04, 8)); f.add(sph(0.045, M.food_g, -0.06, 0.09, 0.05, 8));
      f.add(sph(0.04, M.food_r, 0.02, 0.09, -0.07, 8)); f.add(sph(0.035, M.food_y, -0.08, 0.085, -0.03, 8));
    } else if (kind === 1) { // stir-fry / noodles mound
      const mound = sph(0.12, M.food_y, 0, 0.08, 0, 10); mound.scale.set(1.1, 0.55, 1.1); f.add(mound);
      for (const [dx, dz, mt] of [[0.06, 0.05, M.food_g], [-0.07, 0.03, M.meat], [0.0, -0.08, M.food_r], [-0.05, -0.06, M.food_g]]) f.add(sph(0.035, mt, dx, 0.12, dz, 8));
    } else { // golden fried pieces + garnish
      for (const [dx, dz] of [[-0.06, -0.04], [0.05, -0.05], [0.0, 0.06], [-0.07, 0.05], [0.08, 0.04]]) f.add(rb(0.07, 0.05, 0.05, 0.02, M.food_o, dx, 0.085, dz));
      f.add(sph(0.03, M.food_g, 0.0, 0.11, 0.0, 8)); f.add(sph(0.028, M.food_r, 0.06, 0.1, 0.02, 8));
    }
    f.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  }
  function clearPlate(p) { p.userData.plated = false; const f = p.userData.food; while (f.children.length) f.remove(f.children[0]); }
  function platingTick(t, dt) {
    // advance plates
    let nearDx = 99;
    for (const p of plates) {
      p.userData.bx += dt * BSPEED;
      if (p.userData.bx > BELT.x1) { p.userData.bx = BELT.x0; clearPlate(p); }
      p.position.x = p.userData.bx;
      const dx = p.userData.bx - PLATE_X; if (Math.abs(dx) < Math.abs(nearDx)) nearDx = dx;
      if (!p.userData.plated && p.userData.bx > PLATE_X - 0.05 && p.userData.bx < PLATE_X + 0.25) platePlate(p);
    }
    // ladle arm dabs onto the plate centered beneath it
    const dab = Math.max(0, 1 - Math.min(1, Math.abs(nearDx) / 0.55));
    ladleArm.col.rotation.y = Math.PI * 0 + 0.0;
    ladleArm.seg1.rotation.x = 0.55 + 0.05 * Math.sin(t * 2);
    ladleArm.seg2.rotation.x = -1.05 - 0.5 * dab;                     // dip down onto the plate
    ladleArm.wrist.rotation.x = 0.7 * dab;
    return nearDx;
  }

  /* ===================== prep counters (front) + handoff station ===================== */
  // front prep island
  scene.add(rb(4.2, 0.9, 1.1, 0.05, M.steel, -1.5, 0.45, 2.4));
  scene.add(rb(4.3, 0.06, 1.2, 0.03, M.steelD, -1.5, 0.93, 2.4));
  // chopping board + veg on the prep island
  scene.add(rb(0.7, 0.05, 0.5, 0.02, M.wood, -2.4, 0.97, 2.4));
  for (const [dx, dz, mt] of [[-0.2, -0.1, M.food_g], [0.0, 0.05, M.food_r], [0.18, -0.05, M.food_o], [0.05, 0.15, M.food_g]]) scene.add(sph(0.06, mt, -2.4 + dx, 1.04, 2.4 + dz, 8));
  // stack of clean plates on the prep island
  for (let i = 0; i < 6; i++) scene.add(cyl(0.2, 0.17, 0.035, M.plate, -0.2, 0.96 + i * 0.04, 2.6, 20));
  // HANDOFF station — a steel stand between prep and the pick arm; chef sets an ingredient tray here, robot picks from it
  const HANDOFF = { x: 1.6, y: 0.94, z: 0.2 };
  scene.add(rb(0.9, 0.9, 0.7, 0.04, M.steelD, HANDOFF.x, 0.45, HANDOFF.z));
  scene.add(rb(0.95, 0.06, 0.75, 0.03, M.steel, HANDOFF.x, 0.92, HANDOFF.z));
  // a small parts chute on the handoff stand (suggests flow toward the line, doesn't cross the belt)
  scene.add(box(0.55, 0.05, 0.5, M.steelD, HANDOFF.x, 0.86, HANDOFF.z - 0.55).rotateX(-0.25));

  // the ingredient tray the human chef carries to the handoff station
  function makeTray() {
    const g = new THREE.Group(); g.add(rb(0.42, 0.05, 0.32, 0.02, M.steel, 0, 0, 0));
    g.add(box(0.4, 0.06, 0.3, M.darkSteel, 0, -0.02, 0));
    for (const [dx, dz, mt] of [[-0.1, -0.06, M.food_r], [0.08, 0.0, M.food_g], [0.0, 0.08, M.food_o], [0.12, -0.08, M.food_y]]) g.add(sph(0.05, mt, dx, 0.07, dz, 8));
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.userData.hold = { pos: [0.02, 0.18, 0.16], rot: [0, 0, 0] }; return g;
  }
  const tray = makeTray(); const trayPrep = { x: -0.2, y: 0.99, z: 2.2 }; tray.position.set(trayPrep.x, trayPrep.y, trayPrep.z); scene.add(tray);

  /* ===================== misc dressing ===================== */
  // hanging utensil rail under the hood
  scene.add(box(HX * 1.4, 0.04, 0.04, M.darkSteel, 0, 2.1, LZ + 1.0));
  for (let x = -4; x <= 4; x += 0.9) { scene.add(cyl(0.012, 0.012, 0.3, M.steelD, x, 1.94, LZ + 1.0, 6)); scene.add(rb(0.12, 0.16, 0.02, 0.03, M.steel, x, 1.74, LZ + 1.0)); }
  // wall shelf with pots
  scene.add(box(HX * 1.2, 0.05, 0.4, M.steel, 0, 2.0, -HZ + 0.3));
  for (let x = -5; x <= 5; x += 1.3) scene.add(cyl(0.18, 0.16, 0.26, M.steelD, x, 2.16, -HZ + 0.3, 16));
  // dish-rack trolley (front-right)
  {
    const g = new THREE.Group(); g.position.set(6.4, 0, 1.8); scene.add(g);
    g.add(rb(0.9, 0.05, 0.6, 0.02, M.steel, 0, 0.85, 0)); g.add(rb(0.9, 0.05, 0.6, 0.02, M.steel, 0, 0.5, 0));
    for (const [x, z] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) g.add(cyl(0.025, 0.025, 0.85, M.steelD, x, 0.42, z, 8));
    for (const [x, z] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) g.add(cyl(0.05, 0.05, 0.04, M.rubber, x, 0.04, z, 10).rotateZ(Math.PI / 2));
    for (let i = 0; i < 5; i++) g.add(cyl(0.18, 0.15, 0.03, M.plate, -0.25 + i * 0.005, 0.88 + i * 0.045, 0.0, 18));
  }
  // trash bins + control console
  scene.add(cyl(0.26, 0.22, 0.7, M.darkSteel, 7.0, 0.35, 3.4, 16)); scene.add(cyl(0.27, 0.27, 0.04, M.steel, 7.0, 0.7, 3.4, 16));
  {
    const g = new THREE.Group(); g.position.set(-6.6, 0, 2.6); g.rotation.y = 0.4; scene.add(g);
    g.add(rb(0.8, 1.0, 0.4, 0.05, M.panel, 0, 0.5, 0)); g.add(rb(0.74, 0.5, 0.05, 0.03, M.screen, 0, 0.95, 0.2));
    g.add(cyl(0.04, 0.04, 0.1, M.accent, -0.2, 1.2, 0.18, 10)); g.add(cyl(0.04, 0.04, 0.1, M.food_r, 0.2, 1.2, 0.18, 10));
  }
  // floor drain strip + a yellow wet-floor lane
  { const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.16, HZ * 1.6), C(0xddb53f, 0.7)); lane.rotation.x = -Math.PI / 2; lane.position.set(3.4, 0.012, 0.4); scene.add(lane); }

  /* ===================== foreground: pass / storage / cold-line ===================== */
  // PASS / pickup counter (front) — finished dishes under warming lamps + order tickets
  {
    const g = new THREE.Group(); g.position.set(2.4, 0, 4.2); scene.add(g);
    g.add(rb(3.2, 0.92, 0.85, 0.05, M.steel, 0, 0.46, 0)); g.add(rb(3.3, 0.06, 0.95, 0.03, M.steelD, 0, 0.95, 0));
    g.add(cyl(0.03, 0.03, 0.78, M.steelD, -1.4, 1.34, 0, 8)); g.add(cyl(0.03, 0.03, 0.78, M.steelD, 1.4, 1.34, 0, 8));
    g.add(box(2.9, 0.1, 0.18, M.darkSteel, 0, 1.74, 0));                              // warming-lamp bar
    for (let i = -1; i <= 1; i++) {
      g.add(cyl(0.05, 0.05, 0.07, M.warm, i * 0.95, 1.66, 0, 12));
      const pl = new THREE.PointLight(0xff8a30, 0.5, 3.4, 2); pl.position.set(i * 0.95, 1.5, 0); g.add(pl);
    }
    for (let i = 0; i < 3; i++) {
      g.add(cyl(0.2, 0.17, 0.035, M.plate, -0.8 + i * 0.8, 0.985, 0, 20));
      g.add(cyl(0.09, 0.09, 0.05, M.rice, -0.8 + i * 0.8, 1.03, 0, 12));
    }                  // dishes plated up & waiting
    g.add(box(2.7, 0.02, 0.02, M.steelD, 0, 1.92, -0.18));                            // ticket rail
    for (let i = 0; i < 6; i++) g.add(box(0.15, 0.19, 0.004, M.food_w, -1.05 + i * 0.42, 1.81, -0.18));
  }
  // tall ingredient shelf (storage) — front-left
  {
    const g = new THREE.Group(); g.position.set(-6.7, 0, 4.0); g.rotation.y = 0.25; scene.add(g);
    for (let s = 0; s < 4; s++) g.add(box(1.5, 0.05, 0.72, M.steelD, 0, 0.55 + s * 0.66, 0));
    for (const [x, z] of [[-0.66, -0.32], [0.66, -0.32], [-0.66, 0.32], [0.66, 0.32]]) g.add(cyl(0.03, 0.03, 2.6, M.steelD, x, 1.3, z, 8));
    const cols = [M.food_r, M.food_g, M.food_y, M.food_o, M.bin, M.rice];
    for (let s = 0; s < 4; s++) for (let i = 0; i < 3; i++) g.add(rb(0.36, 0.32, 0.54, 0.03, cols[(s * 3 + i) % cols.length], -0.5 + i * 0.5, 0.74 + s * 0.66, 0));
  }
  // reach-in fridges along the right wall (cold line)
  {
    const g = new THREE.Group(); g.position.set(HX - 0.42, 0, -0.6); g.rotation.y = -Math.PI / 2; scene.add(g);
    for (let i = 0; i < 2; i++) {
      const dx = i * 1.32 - 0.66;
      g.add(rb(1.24, 2.1, 0.72, 0.05, M.steel, dx, 1.05, 0)); g.add(rb(1.02, 1.78, 0.05, 0.02, M.steelD, dx, 1.08, 0.37));
      g.add(box(0.05, 0.55, 0.05, M.darkSteel, dx - 0.42, 1.08, 0.41)); g.add(box(0.44, 0.13, 0.02, M.screen, dx, 2.0, 0.38));
    }
  }
  // 3-compartment sink (front-right)
  {
    const g = new THREE.Group(); g.position.set(5.4, 0, 3.4); scene.add(g);
    g.add(rb(1.8, 0.9, 0.7, 0.04, M.steel, 0, 0.45, 0)); g.add(rb(1.85, 0.06, 0.75, 0.03, M.steelD, 0, 0.93, 0));
    for (let i = -1; i <= 1; i++) g.add(rb(0.46, 0.18, 0.5, 0.03, M.steelD, i * 0.55, 0.86, 0));
    g.add(cyl(0.025, 0.025, 0.4, M.steel, 0, 1.12, -0.2, 8)); g.add(cyl(0.025, 0.025, 0.22, M.steel, 0, 1.3, -0.11, 8).rotateX(0.9));
  }
  // a couple of hanging copper pans over the prep island (warmth + height detail)
  for (const dx of [-0.6, 0.1, 0.8]) {
    scene.add(cyl(0.008, 0.008, 0.5, M.steelD, -1.5 + dx, 2.45, 2.4, 6));
    scene.add(cyl(0.16, 0.18, 0.07, M.copper, -1.5 + dx, 2.18, 2.4, 16)); scene.add(box(0.22, 0.02, 0.03, M.copper, -1.5 + dx - 0.2, 2.2, 2.4));
  }

  /* ===================== actors — human chefs ===================== */
  const world = ActorWorld({
    scene,
    zone: { x0: -7.4, x1: 7.4, z0: -3.0, z1: 5.0 }, radius: 0.34, cell: 0.34, speed: 1.2,
    obstacles: [
      { x0: -7.4, x1: 7.4, z0: -5.2, z1: -3.2 },   // range line + arms
      { x0: -7.5, x1: 7.5, z0: -3.2, z1: -1.7 },   // conveyor belt — full barrier, people can't walk through it
      { x0: -3.7, x1: 0.7, z0: 1.8, z1: 3.0 },     // prep island
      { x0: 1.1, x1: 2.2, z0: -0.2, z1: 0.6 },     // handoff stand
      { x0: 5.9, x1: 6.9, z0: 1.4, z1: 2.2 },      // dish trolley
      { x0: 6.6, x1: 7.4, z0: 3.0, z1: 3.8 },      // trash
      { x0: -7.1, x1: -6.0, z0: 2.1, z1: 3.1 },    // console
      { x0: 0.6, x1: 4.2, z0: 3.7, z1: 4.8 },      // pass counter
      { x0: -7.6, x1: -5.8, z0: 3.3, z1: 4.8 },    // ingredient shelf
      { x0: 4.4, x1: 6.4, z0: 3.0, z1: 3.9 },      // sink
    ],
  });

  // Chef A — runs ingredients from prep to the handoff stand (human↔robot handoff), then back
  world.spawn({ kind: 'm', height: 1.8, x: -0.2, z: 2.0, tint: 0xdfe4ea, routine: [
    { go: [-0.2, 1.6] }, { face: [-0.2, 2.6] }, { wait: 0.8 }, { grab: tray },
    { go: [1.6, 0.9] }, { put: [HANDOFF.x, HANDOFF.y, HANDOFF.z] }, { wait: 1.4, face: [1.6, -2] },
    { go: [1.6, 0.9] }, { grab: tray }, { go: [-0.2, 1.6] }, { put: [trayPrep.x, trayPrep.y, trayPrep.z] }, { wait: 1.6 }] });
  // Chef B — prep cook, chopping at the board (operate pose), occasionally steps to the plate stack
  world.spawn({ kind: 'f', height: 1.66, x: -2.4, z: 1.7, tint: 0xe9d8c4, routine: [
    { go: [-2.4, 1.9] }, { wait: 6, pose: 'operate', face: [-2.4, 3] }, { go: [-0.2, 1.9] }, { wait: 3, pose: 'operate', face: [-0.2, 3] }] });
  // Chef C — expediter, walks the line checking stations
  world.spawn({ kind: 'm', height: 1.76, x: 3, z: 1.5, tint: 0xc8d0d8, routine: [
    { go: [5.0, 0.0] }, { face: [5.0, -2] }, { wait: 2.5 }, { go: [-2.0, 0.2] }, { face: [-2, -3] }, { wait: 2.5 }, { go: [3, 1.2] }, { wait: 1.5 }] });
  // one free-wandering porter for life
  world.spawn({ kind: 'f', height: 1.62, x: 5, z: 3, tint: 0xbac2ca });

  /* ===================== r128-look shim ===================== */
  // The vr original was authored on three r128, whose pipeline fed raw hex values
  // to the shader and sRGB-encoded on output — every color rendered LIGHTER than
  // its hex. The look was tuned on that pipeline. Reproduce it by mapping each
  // stored (linear) color through linear→sRGB once. Runs after ALL materials exist
  // (actors included). New-world code should NOT copy this — author true hex.
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

  /* ===================== loop ===================== */
  let tt = 0, beat = 0;
  function renderFrame(dt) {
    dt = Math.min(dt, 0.05); tt += dt;      // clamp: a backgrounded tab must not jump the belt
    beat = Math.floor(tt / 2.0);
    world.tick(dt); emittersTick(dt);
    wokTick(tt, beat); grdTick(tt); pickTick(tt); fryTick(tt); platingTick(tt, dt);
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
      _soft.dispose(); floorTex.dispose(); wallTex.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    },
  };
}
