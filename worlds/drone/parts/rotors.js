// rotors — four folding shoulders, four carbon arms, four outrunner motors, and four props whose
// blades are real aerofoils.
// Datum: mounted. Positions come from params' derived reach.
// Pivots: `prop0..3` — main.js spins them from one angle and the handedness table.
//
// Two things here are worth the trouble:
//
//   THE SHOULDER. An arm that simply pierces the shell is the surest sign of a model rather than
//   a machine. This one lands in a moulded hinge block with a pivot pin through it and a knurled
//   collar clamping the tube — the joint a folding arm actually has.
//
//   THE BLADE. Lofted from cambered aerofoil sections (shapes.bladeGeo), tapering and twisting
//   and sweeping, with an elliptical tip, and the two handednesses built as TRUE MIRRORS — not
//   the same blade with a negative scale, which turns the lighting inside out.
//
// Every static piece is authored once in the arm's own frame (+Z outboard) and instanced at the
// four azimuths, so four arms cost about as many draw calls as one (E4).
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { ARM, MOTOR, PROP, BODY, DECK, FIT, PARTY, PALETTE } from '../params.js';
import * as S from '../shapes.js';

export const params = ARM;
export const datum = 'mounted';

const ROOT_R = 0.0620;                                   // where the shoulder sits on the flank
const TUBE_R0 = 0.0745;                                  // and where the carbon starts
const ARM_Y = PARTY + 0.0080;                            // the arm's height at the shoulder
const MOTOR_Y = DECK - 0.0075;                           // and at the far end: it rises outboard
const TILT = Math.atan2(MOTOR_Y - ARM_Y, ARM.reach - TUBE_R0);

export const inventory = [
  `arm reach ${Math.round(params.reach * 1000)}mm at ${params.spreadDeg}° — DERIVED from a `
    + `${PROP.R * 2000}mm prop and ${PROP.clearance * 1000}mm of clearance, so the discs cannot touch`,
  `each arm lands in a ${params.hingeL * 1000}mm moulded shoulder with a pivot pin and a knurled `
    + `locking collar, and rises ${(TILT / S.D2R).toFixed(1)}° outboard`,
  `${MOTOR.length} outrunners ø${params.motorR * 2000}mm: ${params.statorTeeth} wound stator teeth `
    + `under a bell with ${params.bellVents} cut vents, a circlip and two mount screws`,
  `props lofted from cambered aerofoil sections — ${PROP.thickRoot * 100}% thick at the root falling `
    + `to ${PROP.thickTip * 100}%, ${PROP.twistRoot}° of twist falling to ${PROP.twistTip}°, `
    + 'swept back, with an elliptical tip',
  'handedness alternates round the aircraft — two CW, two CCW, built as mirrored blades — which '
    + 'is what cancels the yaw; the CW pair wear the bright hub nut',
];

/** The blade's planform, station by station. `hand` mirrors it about the chord plane. */
const plan = (hand) => (t) => {
  const tipFade = t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.145) ** 2)) : 1;
  const chord = (PROP.chordRoot + (PROP.chordTip - PROP.chordRoot) * t) * (0.72 + 0.28 * Math.min(1, t * 4)) * tipFade;
  return {
    r: PROP.cuffR * 0.78 + (PROP.R - PROP.cuffR * 0.78) * t,
    chord: Math.max(chord, 0.0004),
    twistDeg: hand * (PROP.twistRoot + (PROP.twistTip - PROP.twistRoot) * t),
    sweep: hand * 0.32 * PROP.chordRoot * t * t,
    rise: 0.0075 * t * t,                                // the coning a loaded blade sits at
    thick: PROP.thickRoot + (PROP.thickTip - PROP.thickRoot) * t,
    camber: hand * PROP.camber,
  };
};

/** The bell of an outrunner: a skirt with cut vents, a chamfered top, a bore, two screw seats. */
function bellGeo(p) {
  const h = p.motorH * 0.78;
  return S.csg(
    () => {
      let bell = MK.hull(                                 // chamfered top edge, filleted skirt
        S.cylY(h * 0.72, p.motorR, p.motorR, 40, [0, 0, 0]),
        S.cylY(h, p.motorR * 0.93, p.motorR * 0.93, 40, [0, 0, 0]));
      const cuts = [S.cylY(h * 2, p.motorR * 0.80, p.motorR * 0.80, 36, [0, -h * 0.75, 0])];
      for (let i = 0; i < p.bellVents; i++) {
        const a = (i / p.bellVents) * Math.PI * 2;
        cuts.push(MK.cube(0.0032, h * 0.62, 0.0075).rotate([0, -a / S.D2R, 0])
          .translate([Math.cos(a) * p.motorR * 0.96, -h * 0.06, Math.sin(a) * p.motorR * 0.96]));
      }
      for (const sx of [-1, 1])
        cuts.push(S.cylY(0.0060, 0.0013, 0.0013, 12, [sx * p.motorR * 0.52, h * 0.36, 0]));
      return cuts.reduce((s, c) => s.subtract(c), bell);
    },
    () => new THREE.CylinderGeometry(p.motorR, p.motorR, h, 32),
    34);
}

/** The shoulder: a moulded block, hollowed for the tube, with the hinge bore across it. */
function hingeGeo(p) {
  return S.csg(
    () => {
      const block = MK.hull(
        S.rb(p.hingeW, p.hingeH, 0.0080, 0.0026, 16, [0, ARM_Y, ROOT_R - p.hingeL / 2]),
        S.rb(p.hingeW * 0.74, p.hingeH * 0.66, 0.0080, 0.0026, 16,
          [0, ARM_Y + Math.tan(TILT) * p.hingeL * 0.8, ROOT_R + p.hingeL / 2]));
      return block
        .subtract(S.cylX(p.hingeW * 1.4, 0.0026, 0.0026, 18, [0, ARM_Y, ROOT_R - p.hingeL * 0.30]))
        .subtract(MK.cube(p.hingeW * 0.42, p.hingeH * 1.2, p.hingeL * 0.66)
          .translate([0, ARM_Y + p.hingeH * 0.62, ROOT_R]));
    },
    () => MK.rbGeo(p.hingeW, p.hingeH, p.hingeL, 0.0026),
    36);
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'rotors';

  const shell = new THREE.MeshPhysicalMaterial({
    color: PALETTE.shell, roughness: 0.46, metalness: 0.18,
    clearcoat: 0.35, clearcoatRoughness: 0.42, envMapIntensity: 1.0 });
  const carbon = new THREE.MeshPhysicalMaterial({
    color: PALETTE.carbon, roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.09 });
  const alu = new THREE.MeshStandardMaterial({ color: PALETTE.alu, roughness: 0.26, metalness: 0.94 });
  const aluDark = new THREE.MeshStandardMaterial({ color: PALETTE.aluDark, roughness: 0.44, metalness: 0.76 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.carbonLit, roughness: 0.42, metalness: 0.42 });
  const black = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.6, metalness: 0.2 });
  const copper = new THREE.MeshStandardMaterial({ color: PALETTE.copper, roughness: 0.34, metalness: 0.92 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.20, metalness: 0.97 });
  const blade = new THREE.MeshPhysicalMaterial({
    color: 0x191c21, roughness: 0.52, metalness: 0.10,
    clearcoat: 0.30, clearcoatRoughness: 0.40, envMapIntensity: 0.75 });

  // every static piece is authored in the arm frame and dropped at the four azimuths
  const AZ = MOTOR.map((m) => ({ rot: [0, Math.atan2(m.x, m.z), 0] }));
  const arm = (geo, mat, opts) => g.add(S.repeat(geo, mat, AZ, opts));

  // ---- the shoulder, its pin, and the locking collar ----
  arm(hingeGeo(p), shell);
  const pinGeo = new THREE.CylinderGeometry(0.0026, 0.0026, p.hingeW + 0.0016, 18).rotateZ(Math.PI / 2)
    .translate(0, ARM_Y, ROOT_R - p.hingeL * 0.30);
  arm(pinGeo, steel, { shadow: false });
  const tubeLen = Math.hypot(ARM.reach - TUBE_R0, MOTOR_Y - ARM_Y);
  const collarGeo = new THREE.CylinderGeometry(p.R * 1.42, p.R * 1.42, 0.0075, 28)
    .rotateX(Math.PI / 2 + TILT).translate(0, ARM_Y + 0.0016, TUBE_R0 + 0.0020);
  arm(collarGeo, aluDark);
  // the knurling on it, so it reads as something a thumb turns: 40 teeth × 4 collars, one call
  {
    const teeth = [];
    for (const m of MOTOR) {
      const az = Math.atan2(m.x, m.z);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, az, 0))
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + TILT, 0, 0)));
      const o = new THREE.Vector3(0, ARM_Y + 0.0016, TUBE_R0 + 0.0020).applyEuler(new THREE.Euler(0, az, 0));
      teeth.push(...S.ringPlaces(40, p.R * 1.43, q, o));
    }
    g.add(S.repeat(S.knurlTooth(p.R * 1.43, 0.0062, 40), aluDark, teeth, { shadow: false }));
  }

  // ---- the carbon tube, rising outboard, with a machined end fitting ----
  const tubeGeo = new THREE.CylinderGeometry(p.R * 0.90, p.R, tubeLen, 26)
    .rotateX(Math.PI / 2 + TILT)
    .translate(0, (ARM_Y + MOTOR_Y) / 2, (TUBE_R0 + ARM.reach) / 2);
  arm(tubeGeo, carbon);

  // ---- the motor mount at the tube's end ----
  const clampZ = ARM.reach - p.motorR * 0.92;
  const mountGeo = S.csg(
    () => MK.hull(
      S.cylY(0.0052, p.motorR * 1.06, p.motorR * 1.06, 32, [0, MOTOR_Y - 0.0030, ARM.reach]),
      S.cylY(0.0100, p.motorR * 0.74, p.motorR * 0.74, 32, [0, MOTOR_Y - 0.0054, ARM.reach]),
      MK.cylinder(0.0175, p.R * 1.34, p.R * 1.34, 24).rotate([90 + TILT / S.D2R, 0, 0])
        .translate([0, MOTOR_Y - 0.0038 - Math.tan(TILT) * p.motorR * 1.3, clampZ]))
      // the split and the pinch bolt that make it a clamp
      .subtract(MK.cube(0.0016, 0.0300, 0.0150).translate([0, MOTOR_Y + 0.0030, clampZ - 0.0070]))
      .subtract(S.cylX(0.0400, 0.0013, 0.0013, 12, [0, MOTOR_Y - 0.0028, clampZ - 0.0090])),
    () => new THREE.CylinderGeometry(p.motorR * 1.1, p.motorR * 1.1, 0.0070, 24)
      .translate(0, MOTOR_Y - 0.0038, ARM.reach),
    36);
  arm(mountGeo, aluDark);
  // the four bolts that hold the motor down, on its bolt circle
  {
    const bolts = [];
    for (const m of MOTOR)
      bolts.push(...S.ringPlaces(4, p.motorR * 0.86, new THREE.Quaternion(),
        new THREE.Vector3(m.x, MOTOR_Y - 0.0002, m.z), Math.PI / 4));
    g.add(S.repeat(new THREE.CylinderGeometry(0.0015, 0.0015, 0.0016, 12), steel, bolts, { shadow: false }));
  }

  // ---- the motor: stator, windings, bell ----
  const statorGeo = new THREE.CylinderGeometry(p.motorR * 0.60, p.motorR * 0.60, 0.0088, 32)
    .translate(0, MOTOR_Y + 0.0052, ARM.reach);
  arm(statorGeo, aluDark, { shadow: false });
  // the wound teeth: 12 a motor, 48 in one draw call
  const coilGeo = new THREE.BoxGeometry(0.0032, 0.0082, 0.0042);
  const coils = [];
  for (const m of MOTOR)
    for (let i = 0; i < p.statorTeeth; i++) {
      const a = (i / p.statorTeeth) * Math.PI * 2;
      coils.push({
        at: [m.x + Math.cos(a) * p.motorR * 0.70, MOTOR_Y + 0.0052, m.z + Math.sin(a) * p.motorR * 0.70],
        rot: [0, -a, 0] });
    }
  g.add(S.repeat(coilGeo, copper, coils, { shadow: false }));

  const bell = bellGeo(p);
  bell.translate(0, MOTOR_Y + 0.0098, ARM.reach);
  arm(bell, alu);
  // the shaft collar and the two bell screws
  arm(new THREE.CylinderGeometry(p.motorR * 0.30, p.motorR * 0.30, 0.0034, 20)
    .translate(0, MOTOR_Y + 0.0060 + p.motorH * 0.36, ARM.reach), steel, { shadow: false });
  {
    const head = new THREE.CylinderGeometry(0.0017, 0.0017, 0.0016, 14);
    const places = [];
    for (const m of MOTOR) {
      const az = Math.atan2(m.x, m.z);
      for (const sx of [-1, 1]) {
        const v = new THREE.Vector3(sx * p.motorR * 0.52, MOTOR_Y + 0.0098 + p.motorH * 0.28, ARM.reach)
          .applyEuler(new THREE.Euler(0, az, 0));
        places.push({ at: v.toArray() });
      }
    }
    g.add(S.repeat(head, steel, places, { shadow: false }));
  }
  // and the three-phase leads running down the arm into the shoulder
  const leadGeo = new THREE.CylinderGeometry(0.0011, 0.0011, tubeLen * 0.36, 8)
    .rotateX(Math.PI / 2 + TILT)
    .translate(0, ARM_Y + 0.0012 + Math.tan(TILT) * tubeLen * 0.18, TUBE_R0 + tubeLen * 0.18);
  arm(leadGeo, black, { shadow: false });

  // ---- the props ----
  const bladeGeo = { 1: S.bladeGeo(plan(1)), '-1': S.bladeGeo(plan(-1)) };
  const hubGeo = S.csg(
    () => MK.hull(
      S.cylY(PROP.hubH, PROP.hubR * 1.12, PROP.hubR * 1.12, 34, [0, PROP.hubH * 0.24, 0]),
      S.cylY(PROP.hubH * 0.55, PROP.cuffR * 1.02, PROP.cuffR * 1.02, 34, [0, -PROP.hubH * 0.30, 0]))
      .subtract(S.cylY(PROP.hubH * 3, PROP.hubR * 0.42, PROP.hubR * 0.42, 20, [0, 0, 0]))
      // the two slots a quick-release prop drops onto
      .subtract(MK.cube(PROP.hubR * 2.6, PROP.hubH * 0.5, 0.0026)
        .translate([0, -PROP.hubH * 0.30, 0])),
    () => new THREE.CylinderGeometry(PROP.hubR, PROP.hubR * 1.1, PROP.hubH, 24),
    34);
  const nutGeo = new THREE.CylinderGeometry(PROP.hubR * 0.62, PROP.hubR * 0.72, 0.0034, 6)
    .translate(0, PROP.hubH * 0.55, 0);

  MOTOR.forEach((m, i) => {
    const prop = new THREE.Group();
    prop.name = `prop${i}`;
    prop.position.set(m.x, MOTOR_Y + 0.0098 + p.motorH * 0.44, m.z);
    prop.add(new THREE.Mesh(hubGeo, dark));
    prop.add(new THREE.Mesh(nutGeo, m.spin > 0 ? alu : black));   // CW props wear the bright nut
    for (let b = 0; b < PROP.blades; b++) {
      const bl = new THREE.Mesh(bladeGeo[m.spin], blade);
      bl.rotation.y = (b / PROP.blades) * Math.PI * 2;
      bl.castShadow = true;
      prop.add(bl);
    }
    g.add(prop);
  });

  return g;
}
