// drivetrain — forged cranks on a five-arm spider, two chainrings with real windows in them, an
// eight-sprocket cassette, both derailleurs, pedals with toe clips, and a chain made of 110
// rollers and their side plates that RUNS when the cranks turn.
// Datum: mounted (it hangs on the bottom bracket and the rear hub).
// Pivots: `cranks` turns about z; `pedalleft` / `pedalright` counter-turn so the pedals stay
// level; `cassette` turns with the rear wheel; `jockeyupper` / `jockeylower` turn with the chain.
// The chain itself is driven through `chain.userData.advance(distance)`.
import * as THREE from 'three';
import { DRIVE, CHAIN, WHEEL, P, PALETTE } from '../params.js';
import { sprocketGeo } from '/runtime/forms.js';
import { merge, taperedTubeGeo, chainRun } from '../forms.js';

export const params = DRIVE;
export const datum = 'mounted';

const CHAIN_Z = 0.0500;                      // the drive plane: rings, cogs and chain all live here
const JOCKEY_R = 0.0175;
const CHAIN_COG = 5;                         // which sprocket the chain is sitting on
const BCD = 0.0650;                          // 130mm bolt circle, as radius

export const inventory = [
  `${params.chainringTeeth}/${params.innerTeeth} chainrings — teeth cut into the disc at ½" pitch, `
    + `ø${Math.round(params.chainringR * 2000)}mm, with five windows and five bolts at a `
    + `${BCD * 2000}mm bolt circle`,
  `${params.cogs.length}-sprocket cassette, ${Math.round(params.cogs[0] * 2000)} down to `
    + `${Math.round(params.cogs[params.cogs.length - 1] * 2000)}mm, on a lockring`,
  `${params.crank * 1000}mm cranks: a forged outline waisted between two bosses, not a bar — and `
    + `they clear the ground by ${Math.round((P.bbY - params.crank) * 1000)}mm at the bottom`,
  'the chain is ~110 ROLLERS with peanut side plates alternating outer and inner, laid on one '
    + 'closed path over ring, cog and both jockey wheels — and it moves with the cranks',
  'both derailleurs: a front cage over the big ring on its clamp band, and a rear parallelogram '
    + 'hanging off the dropout with a sprung cage',
  'pedals with steel toe clips and leather straps, on quill spindles',
];

/** points along an arc of a circle, for stitching the chain path together */
function arc(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, CHAIN_Z));
  }
  return out;
}

/** A chainring: teeth round the outside, a bore, and five WINDOWS between the arms. A toothed
 *  annulus reads as a saw blade; the windows are what say "this bolts to a spider". */
function ringGeo(rOuter, teeth, thickness, { rBore, windows = 5 }) {
  const th = Math.min(rOuter * 0.10, ((Math.PI * rOuter) / teeth) * 0.9);
  const shape = new THREE.Shape();
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = i % 2 ? rOuter - th : rOuter;
    const [x, y] = [Math.cos(t) * r, Math.sin(t) * r];
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, rBore, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const r0 = rBore + (rOuter - th - rBore) * 0.20;
  const r1 = rBore + (rOuter - th - rBore) * 0.82;
  // half a sector off the spider's arms — a window sitting exactly over an arm shows the arm
  // through it and the ring reads as solid
  for (let i = 0; i < windows; i++) {
    const c = (i / windows) * Math.PI * 2 + 0.30 + Math.PI / windows;
    const half = (Math.PI / windows) * 0.72;
    const w = new THREE.Path();
    w.absarc(0, 0, r1, c - half, c + half, false);
    w.absarc(0, 0, r0, c + half, c - half, true);
    shape.holes.push(w);
  }
  return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 })
    .translate(0, 0, -thickness / 2);
}

/** A forged crank arm: a bearing boss at the spindle, a pedal eye at the far end, and a waist
 *  between them. Built lying in the crank's plane and extruded across it. */
function crankArmGeo(len, side) {
  const s = new THREE.Shape();
  const r0 = 0.0205, r1 = 0.0125;
  // both arcs bulge AWAY from the arm: the spindle boss round the back, the pedal eye round the
  // front. Wind them the other way and the arm comes out as a crescent.
  s.absarc(0, 0, r0, Math.PI / 2, -Math.PI / 2, false);
  s.quadraticCurveTo(len * 0.5, -0.0092, len, -r1);
  s.absarc(len, 0, r1, -Math.PI / 2, Math.PI / 2, false);
  s.quadraticCurveTo(len * 0.5, 0.0092, 0, r0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.0125, bevelEnabled: true, bevelThickness: 0.0022, bevelSize: 0.0022, bevelSegments: 2,
    curveSegments: 12,
  }).translate(0, 0, -0.00625);
  if (side < 0) g.rotateZ(Math.PI);            // the left arm is the same forging, 180° opposed
  return g;
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'drivetrain';

  const alloy = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.22, metalness: 0.94 });
  const alloyDark = new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, roughness: 0.32, metalness: 0.88 });
  const black = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.55, metalness: 0.3 });
  const leather = new THREE.MeshStandardMaterial({ color: PALETTE.saddle, roughness: 0.80, metalness: 0.04 });
  const chainMat = new THREE.MeshStandardMaterial({ color: PALETTE.chain, roughness: 0.28, metalness: 0.95 });
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x6e747c, roughness: 0.35, metalness: 0.92 });

  // ---- cranks ----
  const cranks = new THREE.Group();
  cranks.name = 'cranks';
  cranks.position.set(P.bb[0], P.bb[1], 0);

  const armParts = [];
  for (const side of [1, -1]) {
    armParts.push(crankArmGeo(p.crank, side).translate(0, 0, side * (p.qFactor - 0.0065)));
  }
  // the spider: five arms out of the right crank to the bolt circle, each ending in a boss
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.30;
    const [cx, cy] = [Math.cos(a) * BCD, Math.sin(a) * BCD];
    // the arm leaves the crank's INBOARD face — start it further out and the spider blooms
    // through the crank as a raised star nobody put there
    armParts.push(taperedTubeGeo([
      [0, 0, p.qFactor - 0.0135], [cx * 0.45, cy * 0.45, p.qFactor - 0.0150],
      [cx, cy, CHAIN_Z - 0.0055],
    ], [0.0082, 0.0068, 0.0055], { seg: 8, radial: 7 }));
    armParts.push(new THREE.CylinderGeometry(0.0056, 0.0056, 0.0155, 10).rotateX(Math.PI / 2)
      .translate(cx, cy, CHAIN_Z - 0.0075));                     // the chainring bolt
  }
  const arms = new THREE.Mesh(merge(armParts), alloy);
  arms.castShadow = true;
  cranks.add(arms);

  const ring = new THREE.Mesh(
    ringGeo(p.chainringR, p.chainringTeeth, p.ringT, { rBore: BCD - 0.0085 }), alloy);
  ring.position.z = CHAIN_Z;
  ring.castShadow = true;
  const inner = new THREE.Mesh(
    ringGeo(p.innerR, p.innerTeeth, p.ringT, { rBore: BCD - 0.0155, windows: 5 }), alloyDark);
  inner.position.z = CHAIN_Z - 0.0100;
  inner.castShadow = true;
  cranks.add(ring, inner);

  // ---- pedals: a body on a quill spindle, a cage, a toe clip and a leather strap ----
  for (const side of [1, -1]) {
    const pedal = new THREE.Group();
    pedal.name = side > 0 ? 'pedalright' : 'pedalleft';
    pedal.position.set(side * p.crank, 0, side * (p.qFactor + 0.0180));

    const steelParts = [
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.0380, 12).rotateX(Math.PI / 2)
        .translate(0, 0, -side * 0.0190),
      // the cage: two rails top and bottom, so the pedal has a front and a back
      new THREE.BoxGeometry(p.pedalD * 0.94, 0.0022, p.pedalW * 0.22).translate(0, 0.0098, 0),
      new THREE.BoxGeometry(p.pedalD * 0.94, 0.0022, p.pedalW * 0.22).translate(0, -0.0098, 0),
      new THREE.BoxGeometry(0.0034, 0.0230, p.pedalW * 0.90).translate(p.pedalD * 0.45, 0, 0),
      new THREE.BoxGeometry(0.0034, 0.0230, p.pedalW * 0.90).translate(-p.pedalD * 0.45, 0, 0),
      // toe clip: a steel loop standing off the front of the cage
      taperedTubeGeo([
        [p.pedalD * 0.40, -0.0080, 0], [p.pedalD * 0.60, 0.0090, 0],
        [p.pedalD * 0.66, 0.0330, 0], [p.pedalD * 0.40, 0.0470, 0], [0.0060, 0.0430, 0],
      ], [0.0026, 0.0024, 0.0024, 0.0026, 0.0026], { seg: 18, radial: 6 }),
    ];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(p.pedalD * 0.62, p.pedalT * 1.15, p.pedalW * 0.72), black);
    body.castShadow = true;
    const steel = new THREE.Mesh(merge(steelParts), alloy);
    steel.castShadow = true;
    // the strap through the cage, over the top of the clip
    const strap = new THREE.Mesh(merge([
      new THREE.BoxGeometry(0.0030, 0.0165, p.pedalW * 0.96).translate(0.0060, 0.0300, 0),
      new THREE.BoxGeometry(0.0075, 0.0165, 0.0100).translate(0.0055, 0.0300, p.pedalW * 0.42),
    ]), leather);
    pedal.add(body, steel, strap);
    cranks.add(pedal);
  }
  g.add(cranks);

  // ---- cassette on the rear hub: eight sprockets and a lockring, as ONE mesh ----
  const cassette = new THREE.Group();
  cassette.name = 'cassette';
  cassette.position.set(P.rearAxle[0], P.rearAxle[1], 0);
  // largest sprocket INBOARD, smallest outboard, and the one the chain is on (index CHAIN_COG)
  // lands in the chain's plane — otherwise the top view shows a chain running 14mm beside its cog
  const cogParts = p.cogs.map((r, i) => sprocketGeo(r, Math.round((r * 2 * Math.PI) / 0.0127), p.cogT,
    { holeFrac: 0.52 }).translate(0, 0, CHAIN_Z + (i - CHAIN_COG) * p.cogGap));
  cogParts.push(new THREE.CylinderGeometry(0.0245, 0.0245, 0.0060, 24).rotateX(Math.PI / 2)
    .translate(0, 0, CHAIN_Z + (p.cogs.length - CHAIN_COG) * p.cogGap - 0.0010));
  const cogs = new THREE.Mesh(merge(cogParts), alloyDark);
  cogs.castShadow = true;
  cassette.add(cogs);
  g.add(cassette);

  // ---- rear derailleur: a parallelogram hanging off the dropout, and a cage under it ----
  const cogUsed = p.cogs[CHAIN_COG];
  const hanger = [P.rearAxle[0] + 0.0175, P.rearAxle[1] - 0.0470];
  const j1 = [P.rearAxle[0] + 0.0180, P.rearAxle[1] - 0.1180];
  const j2 = [P.rearAxle[0] + 0.0620, P.rearAxle[1] - 0.1520];
  const pKnuckle = [j1[0] - 0.0020, j1[1] + 0.0270];
  const mech = new THREE.Group();
  mech.name = 'derailleur';
  const mechParts = [
    // b-knuckle at the hanger
    new THREE.CylinderGeometry(0.0090, 0.0090, 0.0170, 12).rotateX(Math.PI / 2)
      .translate(hanger[0], hanger[1], CHAIN_Z + 0.0110),
  ];
  // the parallelogram: two links between the knuckles, which is what a derailleur IS
  const linkDir = [pKnuckle[0] - hanger[0], pKnuckle[1] - hanger[1]];
  for (const off of [-0.0085, 0.0085]) {
    const nx = -linkDir[1], ny = linkDir[0];
    const L = Math.hypot(nx, ny);
    mechParts.push(taperedTubeGeo([
      [hanger[0] + (nx / L) * off, hanger[1] + (ny / L) * off, CHAIN_Z + 0.0110],
      [pKnuckle[0] + (nx / L) * off, pKnuckle[1] + (ny / L) * off, CHAIN_Z + 0.0110],
    ], [0.0038, 0.0038], { seg: 4, radial: 6 }));
  }
  // the body is two PLATES either side of the linkage, which is what you actually see through a
  // derailleur — one solid block reads as a lump of cheese
  for (const dz of [-0.0080, 0.0135]) {
    mechParts.push(new THREE.BoxGeometry(0.0175, 0.0400, 0.0030)
      .rotateZ(Math.atan2(pKnuckle[1] - hanger[1], pKnuckle[0] - hanger[0]) - Math.PI / 2)
      .translate((hanger[0] + pKnuckle[0]) / 2 + 0.0020, (hanger[1] + pKnuckle[1]) / 2,
        CHAIN_Z + 0.0110 + dz));
  }
  mechParts.push(
    new THREE.CylinderGeometry(0.0092, 0.0092, 0.0200, 14).rotateX(Math.PI / 2)
      .translate(pKnuckle[0], pKnuckle[1], CHAIN_Z + 0.0105),
    // the spring barrel the cage pivots on, and the cable anchor bolt on the outside
    new THREE.CylinderGeometry(0.0042, 0.0042, 0.0090, 10).rotateX(Math.PI / 2)
      .translate(hanger[0] + 0.0165, hanger[1] - 0.0170, CHAIN_Z + 0.0215),
  );
  // the cage plates the jockeys hang between
  for (const dz of [-0.0090, 0.0140]) {
    mechParts.push(new THREE.BoxGeometry(
      Math.hypot(j2[0] - j1[0], j2[1] - j1[1]) + 0.0180, 0.0150, 0.0022)
      .rotateZ(Math.atan2(j2[1] - j1[1], j2[0] - j1[0]))
      .translate((j1[0] + j2[0]) / 2, (j1[1] + j2[1]) / 2, CHAIN_Z + dz));
  }
  const mechMesh = new THREE.Mesh(merge(mechParts), alloy);
  mechMesh.castShadow = true;
  mech.add(mechMesh);

  const jockeyGeo = merge([
    sprocketGeo(JOCKEY_R, 11, 0.0042, { holeFrac: 0.34 }),
    new THREE.CylinderGeometry(0.0060, 0.0060, 0.0130, 12).rotateX(Math.PI / 2),
  ]);
  const jockeys = [j1, j2].map(([x, y], i) => {
    const jw = new THREE.Mesh(jockeyGeo, black);
    jw.name = i ? 'jockeylower' : 'jockeyupper';
    jw.position.set(x, y, CHAIN_Z);
    jw.castShadow = true;
    mech.add(jw);
    return jw;
  });
  g.add(mech);

  // ---- front derailleur: a clamp band on the seat tube and a cage over the big ring ----
  const fd = new THREE.Group();
  fd.name = 'frontmech';
  const cageX = P.bb[0] + 0.0060;
  // the cage straddles the chain AND the top of the ring's teeth — that is what gives a front
  // mech its clearance argument, and it is why the plates hang to just below the tooth tips
  const cageY = P.bb[1] + p.chainringR + 0.0045;
  const fdParts = [
    // the band's axis is the SEAT TUBE's axis: a cylinder stands on +Y, so it turns by however
    // far the seat tube leans off vertical, and no further
    new THREE.CylinderGeometry(0.0170, 0.0170, 0.0240, 20)
      .rotateZ(Math.atan2(P.seatDir[1], P.seatDir[0]) - Math.PI / 2)
      .translate(P.fdAt[0], P.fdAt[1], 0),
    // the body: a narrow arm reaching from the band out over the chain line, not a slab
    new THREE.BoxGeometry(0.0105, 0.0400, 0.0125)
      .rotateZ(-0.42)
      .translate((P.fdAt[0] + cageX) / 2 + 0.0050, (P.fdAt[1] + cageY) / 2 + 0.0030, CHAIN_Z * 0.50),
  ];
  // the cage: two thin plates the chain sits between, sitting 6mm over the big ring's teeth —
  // any higher and it is not a derailleur, it is a bracket
  for (const dz of [-0.0072, 0.0100]) {
    fdParts.push(new THREE.BoxGeometry(0.0560, 0.0150, 0.0018)
      .rotateZ(0.10).translate(cageX, cageY, CHAIN_Z + dz));
  }
  fdParts.push(new THREE.BoxGeometry(0.0090, 0.0150, 0.0195)
    .rotateZ(0.10).translate(cageX - 0.0250, cageY + 0.0012, CHAIN_Z + 0.0014));
  const fdMesh = new THREE.Mesh(merge(fdParts), alloy);
  fdMesh.castShadow = true;
  fd.add(fdMesh);
  g.add(fd);

  // ---- the chain: one closed path, then 110 links laid along it ----
  const path = [
    ...arc(P.bb[0], P.bb[1], p.chainringR, Math.PI / 2, -Math.PI / 2, 10),      // over the ring
    ...arc(P.bb[0], P.bb[1], p.chainringR, -Math.PI / 2, -Math.PI * 0.86, 4),
    ...arc(j2[0], j2[1], JOCKEY_R, -Math.PI * 0.90, Math.PI * 0.55, 8),         // lower jockey
    ...arc(j1[0], j1[1], JOCKEY_R, -Math.PI * 0.42, Math.PI * 0.92, 8),         // upper jockey
    ...arc(P.rearAxle[0], P.rearAxle[1], cogUsed, -Math.PI * 0.62, Math.PI / 2, 10),   // the cog
  ];
  // 'centripetal' and not 'catmullrom': with sparse arc points a plain Catmull-Rom overshoots on
  // the long straight runs and the chain bulges off its own sprocket
  const curve = new THREE.CatmullRomCurve3(path, true, 'centripetal');
  const run = chainRun(curve, CHAIN, { roller: rollerMat, plate: chainMat });
  const chain = new THREE.Group();
  chain.name = 'chain';
  chain.add(...run.meshes);
  // ONE number drives the chain, the jockeys and (in main.js) the cranks: how far it has run.
  chain.userData.advance = (dist) => {
    run.place(dist);
    jockeys[0].rotation.z = -dist / JOCKEY_R;
    jockeys[1].rotation.z = dist / JOCKEY_R;               // the lower one is wrapped the other way
  };
  chain.userData.advance(0);
  chain.userData.links = run.links;
  g.add(chain);

  return g;
}
