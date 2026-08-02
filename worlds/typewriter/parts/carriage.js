// carriage — the platen and everything that travels with it: end plates, knobs, paper table,
// bail rollers, scale, return lever, and the shoes that ride the frame's rail.
// Datum: mounted (floor coordinates — see the note on ASSEMBLY in params.js).
// Pivots: `carriage` translates in x, `platen` turns about x. main.js drives both.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { CARRIAGE, BODY, PLATEN, ASSEMBLY, PALETTE } from '../params.js';

export const params = CARRIAGE;
export const datum = 'mounted';

export const inventory = [
  `platen: ${params.platenR * 2000}mm rubber roller, ${params.platenLen * 1000}mm long, `
    + `axis ${params.platenRise * 1000}mm above the shell top`,
  `${params.knobR * 2000}mm knurled knobs on both ends, turning with the roller`,
  `paper table stands ${params.tableTilt}° up from horizontal behind the roller`,
  `paper bail on two rollers, ${params.bailRise * 1000}mm above the axis, holding the sheet down`,
  'nickel paper scale across the front of the roller',
  `two shoes ride the frame rail ${Math.round((BODY.railRise) * 1000)}mm above the shell; `
    + `stroke is ±${params.travel * 500}mm`,
  'carriage-return lever on the left end plate',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'carriage';

  const nickel = new THREE.MeshStandardMaterial({ color: PALETTE.nickel, roughness: 0.25, metalness: 0.92 });
  const nickelDull = new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, roughness: 0.42, metalness: 0.8 });
  const rubber = new THREE.MeshStandardMaterial({ color: PALETTE.rubber, roughness: 0.88, metalness: 0.05 });
  const lacquer = new THREE.MeshStandardMaterial({ color: PALETTE.lacquer, roughness: 0.5, metalness: 0.15 });

  // ---- the roller, on its own pivot so a strike can advance the paper ----
  const platen = new THREE.Group();
  platen.name = 'platen';
  platen.position.set(0, PLATEN.y, PLATEN.z);
  g.add(platen);

  const roller = new THREE.Mesh(
    new THREE.CylinderGeometry(p.platenR, p.platenR, p.platenLen, 40).rotateZ(Math.PI / 2), rubber);
  roller.castShadow = roller.receiveShadow = true;
  platen.add(roller);

  // end discs + knobs: one geometry each, mirrored (E4)
  const discGeo = new THREE.CylinderGeometry(p.platenR * 1.04, p.platenR * 1.04, 0.004, 28)
    .rotateZ(Math.PI / 2);
  const knobGeo = MK.latheGeo([                     // dished knob face, knurled edge implied by the bevel
    [0, 0], [p.knobR * 0.92, 0], [p.knobR, 0.0022],
    [p.knobR, p.knobD - 0.0022], [p.knobR * 0.86, p.knobD],
    [p.knobR * 0.55, p.knobD - 0.0016], [0, p.knobD - 0.0016],
  ], 30);
  for (const sx of [-1, 1]) {
    const disc = new THREE.Mesh(discGeo, nickelDull);
    disc.position.x = sx * (p.platenLen / 2 + 0.002);
    platen.add(disc);

    const knob = new THREE.Mesh(knobGeo, nickel);
    knob.position.x = sx * (p.platenLen / 2 + 0.005);
    knob.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;   // face outward on both ends
    knob.castShadow = true;
    platen.add(knob);
  }

  // ---- end plates: they carry the axle and hang the whole carriage off the rail ----
  const plateX = p.platenLen / 2 + p.knobD + 0.010;
  const plateGeo = MK.rbGeo(0.006, 0.052, 0.062, 0.003);     // shared between the two ends
  for (const sx of [-1, 1]) {
    const plate = new THREE.Mesh(plateGeo, lacquer);
    plate.position.set(sx * plateX, PLATEN.y - 0.012, PLATEN.z - 0.018);
    plate.castShadow = plate.receiveShadow = true;
    g.add(plate);
  }

  // back beam + two shoes on the rail. The shoes are what makes the carriage look supported
  // instead of hovering: the rail passes through them.
  const beamY = ASSEMBLY.shellTop + BODY.railRise + 0.004;
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(plateX * 2, 0.006, 0.010), nickelDull);
  beam.position.set(0, beamY, BODY.railZ);
  beam.castShadow = true;
  g.add(beam);

  const shoeGeo = MK.rbGeo(0.014, 0.018, 0.016, 0.003);
  for (const sx of [-1, 1]) {
    const shoe = new THREE.Mesh(shoeGeo, nickelDull);
    shoe.position.set(sx * 0.092, ASSEMBLY.shellTop + BODY.railRise, BODY.railZ);
    shoe.castShadow = true;
    g.add(shoe);
  }

  // ---- paper table: the plate the sheet is fed over, leaning back off the roller ----
  const table = new THREE.Mesh(
    MK.rbGeo(p.tableW, 0.0022, p.tableD, 0.001), lacquer);
  table.position.set(0, PLATEN.y - 0.006, PLATEN.z - p.platenR - 0.010);
  table.rotation.x = (p.tableTilt * Math.PI) / 180;          // +x lifts the BACK edge
  table.castShadow = table.receiveShadow = true;
  g.add(table);

  // ---- paper bail: rod across the front, two rollers pinning the sheet to the platen ----
  const bailY = PLATEN.y + p.bailRise;
  const bailZ = PLATEN.z + p.platenR * 0.55;
  const bailRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0022, 0.0022, p.platenLen * 0.86, 12).rotateZ(Math.PI / 2), nickel);
  bailRod.position.set(0, bailY, bailZ);
  bailRod.castShadow = true;
  g.add(bailRod);

  const bailRollerGeo = new THREE.CylinderGeometry(p.bailR, p.bailR, 0.020, 16).rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) {
    const r = new THREE.Mesh(bailRollerGeo, rubber);
    r.position.set(sx * 0.052, bailY - 0.0005, bailZ);
    r.castShadow = true;
    g.add(r);
  }
  // arms tying the bail back to the end plates, or it floats in front of the roller
  const armGeo = new THREE.CylinderGeometry(0.0018, 0.0018, p.bailRise * 1.1, 8);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, nickel);
    arm.position.set(sx * (p.platenLen / 2 - 0.004), bailY - p.bailRise * 0.55, bailZ - 0.004);
    arm.rotation.x = -0.22;
    g.add(arm);
  }

  // ---- paper scale, right at the type line ----
  const scale = new THREE.Mesh(
    new THREE.BoxGeometry(p.platenLen * 0.92, p.scaleH, 0.0016), nickelDull);
  scale.position.set(0, PLATEN.y - p.platenR * 0.55, PLATEN.z + p.platenR + 0.0035);
  scale.rotation.x = -0.25;
  scale.castShadow = true;
  g.add(scale);

  // ---- carriage-return lever, left end ----
  const lever = new THREE.Group();
  lever.name = 'returnlever';
  lever.position.set(-plateX - 0.004, PLATEN.y + 0.004, PLATEN.z - 0.010);
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.062, 10), nickel);
  shank.rotation.z = 0.62;
  shank.position.set(-0.017, 0.026, 0);
  shank.castShadow = true;
  lever.add(shank);
  const paddle = new THREE.Mesh(MK.rbGeo(0.030, 0.0035, 0.011, 0.0016), lacquer);
  paddle.position.set(-0.036, 0.050, 0);
  paddle.rotation.z = 0.62;
  paddle.castShadow = true;
  lever.add(paddle);
  g.add(lever);

  return g;
}
