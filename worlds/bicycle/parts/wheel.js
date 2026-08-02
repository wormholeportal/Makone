// wheel — one 700c wheel: a box-section rim split at the machined brake track, a gum-wall tyre
// with the size moulded into it and a file tread on the crown, a hub with two flanges and a
// quick release, and 32 spokes laced three-cross with a brass nipple on every one.
// Datum: y=0 is the road. The wheel is built standing on it, centred on x=0, axis along +Z,
// so main.js positions two of these by their axles and nothing else needs to know.
// Pivots: the part's root IS the pivot — turn it about z and the wheel rolls.
//
// build() is called TWICE, so every geometry and every material is made once at module scope and
// handed out (E4): two wheels cost two sets of draw calls and one set of buffers.
import * as THREE from 'three';
import { WHEEL, PALETTE } from '../params.js';
import { lacing, instanced, merge, tubeGeo, sidewallTexture, treadTexture } from '../forms.js';

export const params = WHEEL;

export const inventory = [
  `700c: rim ø${Math.round(params.rimR * 2000)}mm, ${Math.round(params.tyreR * 2000)}mm tyre, `
    + `rolling radius ${Math.round(params.R * 1000)}mm`,
  `box-section rim ${params.rimDepth * 1000}mm deep, built as TWO lathes sharing an edge — the `
    + 'outer one is the machined braking surface, and it is a different metal to look at',
  `${params.spokes} spokes, ${params.cross}-cross, alternating flanges, each with a brass nipple `
    + 'at the rim — two instanced meshes for the pair of wheels, not 128 draw calls',
  'gum sidewall with "700 × 25C" moulded into it and a file tread on the crown: the one warm '
    + 'colour on the machine, and the one place the rubber shows a pattern',
  `hub ø${params.hubR * 2000}mm, flanges ${params.flangeGap * 1000}mm apart, a quick release with `
    + 'a folded lever on one side, and a valve stem through the rim bed',
];

// ---------------------------------------------------------------------------
// geometry and materials, built once and shared by both wheels

let CACHE = null;

function geos(p) {
  if (CACHE) return CACHE;
  const rIn = p.rimR - p.rimDepth, rOut = p.rimR, hw = p.rimW / 2;
  const rSplit = rOut - 0.0165;                        // where the machining stops
  const V = (r, y) => new THREE.Vector2(r, y);

  // The rim is ONE section cut in two at rSplit, so the brake track can be its own material
  // without a second surface hovering 0.2mm above the first (which is how you get z-fighting).
  const body = [V(rSplit, -hw * 0.84), V(rIn + 0.0030, -hw * 0.30), V(rIn, -hw * 0.42),
    V(rIn, hw * 0.42), V(rIn + 0.0030, hw * 0.30), V(rSplit, hw * 0.84)];
  const track = [V(rSplit, -hw * 0.84), V(rOut - 0.0055, -hw), V(rOut, -hw * 0.86),
    V(rOut, hw * 0.86), V(rOut - 0.0055, hw), V(rSplit, hw * 0.84)];

  // tyre: a torus for the casing, and the OUTER 100° of that same cross-section revolved again
  // for the tread. A cylinder at the tyre's outer radius is coincident with the casing and reads
  // as a pinstripe — which is exactly what the first cut looked like.
  const major = p.rimR + p.tyreR * 0.62, minor = p.tyreR + 0.0004;
  const treadProfile = [];
  for (let i = 0; i <= 12; i++) {
    const t = (-50 + (100 * i) / 12) * (Math.PI / 180);
    treadProfile.push(V(major + Math.cos(t) * minor, Math.sin(t) * minor));
  }

  const flange = (sz) => merge([
    new THREE.CylinderGeometry(p.flangeR, p.flangeR * 0.94, 0.0042, 28)
      .rotateX(Math.PI / 2).translate(0, 0, (sz * p.flangeGap) / 2),
    // the shoulder that takes the flange back down to the barrel — a flange on a plain cylinder
    // reads as a washer somebody slid on
    new THREE.CylinderGeometry(p.flangeR * 0.62, p.hubR, 0.0090, 28)
      .rotateX(Math.PI / 2).translate(0, 0, sz * (p.flangeGap / 2 - 0.0066)),
    new THREE.CylinderGeometry(0.0092, 0.0112, 0.0150, 18)
      .rotateX(Math.PI / 2).translate(0, 0, sz * (p.hubW / 2 + 0.0045)),
  ]);

  CACHE = {
    body: new THREE.LatheGeometry(body, 72).rotateX(Math.PI / 2),
    track: new THREE.LatheGeometry(track, 72).rotateX(Math.PI / 2),
    tyre: new THREE.TorusGeometry(major, p.tyreR, 16, 96),
    tread: new THREE.LatheGeometry(treadProfile, 90).rotateX(Math.PI / 2),
    hub: merge([
      new THREE.CylinderGeometry(p.hubR, p.hubR, p.flangeGap - 0.010, 28).rotateX(Math.PI / 2),
      flange(-1), flange(1),
    ]),
    // quick release: a skewer right through, a nut one side, a folded lever the other
    skewer: merge([
      new THREE.CylinderGeometry(0.0026, 0.0026, p.hubW + 0.070, 10).rotateX(Math.PI / 2),
      new THREE.CylinderGeometry(0.0090, 0.0090, 0.0075, 14)
        .rotateX(Math.PI / 2).translate(0, 0, p.hubW / 2 + 0.016),
      new THREE.CylinderGeometry(0.0075, 0.0075, 0.0090, 14)
        .rotateX(Math.PI / 2).translate(0, 0, -p.hubW / 2 - 0.016),
      tubeGeo([0, 0, -p.hubW / 2 - 0.021], [0, 0.0130, -p.hubW / 2 - 0.031], 0.0042, 0.0032, 10),
      tubeGeo([0, 0.0130, -p.hubW / 2 - 0.031], [0, 0.0430, -p.hubW / 2 - 0.028], 0.0040, 0.0025, 10),
    ]),
    valve: merge([
      new THREE.CylinderGeometry(0.0026, 0.0030, p.valveLen, 12)
        .translate(0, -(p.rimR - p.rimDepth * 0.5) - p.valveLen * 0.42, 0),
      new THREE.CylinderGeometry(0.0044, 0.0044, 0.0060, 12)
        .translate(0, -(p.rimR - p.rimDepth * 0.5) - 0.0030, 0),
    ]),
    lace: lacing(p),
  };
  return CACHE;
}

let MATS = null;

function mats() {
  if (MATS) return MATS;
  const tread = treadTexture();
  MATS = {
    // the rim's own anodising, DULLER than the brake track beside it
    rim: new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.38, metalness: 0.88,
      side: THREE.DoubleSide }),
    // a brake track is scrubbed by two pads a thousand times a ride: the brightest metal on the
    // bicycle, and slightly rougher for it
    track: new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.19, metalness: 0.97,
      side: THREE.DoubleSide }),
    gum: new THREE.MeshStandardMaterial({ map: sidewallTexture(), roughness: 0.86, metalness: 0.02 }),
    rubber: new THREE.MeshStandardMaterial({ map: tread, bumpMap: tread, bumpScale: 0.5,
      roughness: 0.95, metalness: 0.02, side: THREE.DoubleSide }),
    alloy: new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.24, metalness: 0.92 }),
    alloyDark: new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, roughness: 0.30, metalness: 0.88 }),
    spoke: new THREE.MeshStandardMaterial({ color: PALETTE.spoke, roughness: 0.22, metalness: 0.95 }),
    brass: new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.34, metalness: 0.90 }),
  };
  return MATS;
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'wheel';
  g.position.y = p.R;                                   // built standing on the road

  const G = geos(p), M = mats();
  const mesh = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  };

  g.add(mesh(G.body, M.rim), mesh(G.track, M.track));
  g.add(mesh(G.tyre, M.gum), mesh(G.tread, M.rubber));
  g.add(mesh(G.hub, M.alloy), mesh(G.skewer, M.alloyDark));
  g.add(instanced(G.lace.spokes, M.spoke), instanced(G.lace.nipples, M.brass));
  g.add(mesh(G.valve, M.brass));

  return g;
}
