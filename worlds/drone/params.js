// drone — one folding camera quadcopter, in metres, in one place.
//
// The only two numbers a multirotor really has are the prop and the arm, and one fixes the other:
//
//   1. PROPS MUST NOT OVERLAP. Adjacent motors have to stand further apart than two prop radii,
//      or the aircraft eats itself on the first spin-up. So the arm reach is DERIVED from the
//      prop radius and a clearance, and the assert at the bottom re-checks both diagonals.
//   2. the camera must see forward without the props in frame: the gimbal hangs below the shell,
//      and its lens axis has to clear the disc the front props sweep. Also asserted.
//   3. the rotors alternate handedness — CW, CCW, CW, CCW round the aircraft — which is what
//      cancels the yaw torque. main.js spins them from ONE angle and the sign from this table.
//
// Everything else in this file is a MANUFACTURING number rather than an aerodynamic one: the
// wall thickness, the parting line where the two shell halves meet, the M2 screw head, the
// 0.5 mm panel gap round the battery. Those are what makes a body read as moulded instead of
// modelled, and like the aerodynamics they are decided here, once, in millimetres — not nudged
// until a screenshot looks acceptable.
//
// The aircraft faces +Z. Motor 0 is front-left, going clockwise seen from above.

export const PALETTE = {
  shell: 0x767b83,           // moulded PC/ABS, matte grey composite
  shellDark: 0x4a4f57,
  shellLip: 0x5c626b,        // the shadow line inside a panel gap
  carbon: 0x1d1f24,
  carbonLit: 0x33373f,
  alu: 0xb9bfc7,
  aluDark: 0x8b9199,
  black: 0x121317,
  rubber: 0x1b1c20,
  lens: 0x14202b,
  glass: 0x223f52,
  coat: 0x4c7f8c,            // the flash off a coated element
  led: 0x2fbf6a,
  ledRed: 0xd6483a,
  gold: 0xc2a24a,
  copper: 0xb06a3a,
};

// ---------------------------------------------------------------------------
// build quality — the numbers that decide whether it reads as a manufactured thing

export const FIT = {
  gap: 0.00050,              // panel gap: what you see between the battery and the shell
  groove: 0.00065,           // the parting line where the upper and lower shell halves meet
  grooveD: 0.00075,          // and how deep it cuts
  wall: 0.00160,             // moulded wall
  screwR: 0.00105,           // M2 clearance
  screwHead: 0.00190,
  fillet: 0.00120,           // the smallest radius anywhere on this aircraft — nothing is a knife edge
};

export const PROP = {
  R: 0.1050,
  blades: 2,
  chordRoot: 0.0170, chordTip: 0.0088,
  twistRoot: 26, twistTip: 8,          // degrees — a prop is a twisted wing, not a flat paddle
  thickRoot: 0.115, thickTip: 0.048,   // aerofoil thickness, as a fraction of chord
  camber: 0.038,                       // and its camber: this is what makes it a wing
  cuffR: 0.0140,                       // the round shank between the hub and where the aerofoil starts
  hubR: 0.0098, hubH: 0.0072,
  clearance: 0.0180,                   // between two prop discs
};

export const BODY = {
  w: 0.0880, h: 0.0620, d: 0.1900,
  round: 0.0100,                       // the shell's corner radius
  noseW: 0.0510, noseDrop: 0.0135,     // how the wedge closes toward the nose
  bayW: 0.0640, bayH: 0.0205, bayD: 0.0760,   // the battery pocket, open at the back
  legH: 0.0480, legW: 0.0132,
  vents: 6,
  y: 0.0000,                           // set below, once the legs are known
};

export const ARM = {
  R: 0.0085,                           // carbon tube
  motorR: 0.0170, motorH: 0.0150,
  statorTeeth: 12,
  bellVents: 9,
  spreadDeg: 42,                       // degrees off the nose, each side
  hingeW: 0.0215, hingeH: 0.0250, hingeL: 0.0320,   // the folding shoulder the tube bolts into
};
// rule 1 — the arm is as long as it has to be, and no longer
ARM.reach = (PROP.R + PROP.clearance / 2) / Math.sin((ARM.spreadDeg * Math.PI) / 180);

export const MOTOR = [];
{
  const a = (ARM.spreadDeg * Math.PI) / 180;
  const sx = Math.sin(a) * ARM.reach, sz = Math.cos(a) * ARM.reach;
  // front-left, front-right, back-right, back-left; handedness alternates (rule 3)
  MOTOR.push({ x: -sx, z: sz, spin: 1 });
  MOTOR.push({ x: sx, z: sz, spin: -1 });
  MOTOR.push({ x: sx, z: -sz, spin: 1 });
  MOTOR.push({ x: -sx, z: -sz, spin: -1 });
}

export const GIMBAL = {
  hangY: 0.0260,                       // below the shell's underside
  yawR: 0.0132,
  rollArm: 0.0300,
  camW: 0.0300, camH: 0.0280, camD: 0.0340,
  lensR: 0.0118, lensLen: 0.0132,
  hoodR: 0.0158,
  knurls: 44,                          // the focus ring: fine enough to read as machined
  fins: 7,                             // and the heat-sink ribs down the camera's flanks
};

// the legs decide where the aircraft sits, so everything above is measured from them
BODY.y = BODY.legH + GIMBAL.hangY * 0.20;
export const DECK = BODY.y + BODY.h;   // the top of the shell, where the battery sits
export const PARTY = BODY.y + BODY.h * 0.42;   // the parting line, level all the way round

/** The shell's cross-sections, tail (−z) to nose (+z). One convex loft: the top deck stays flat
 *  for the battery, the belly rises toward the nose to clear the gimbal, the flanks draw in. */
export const STATIONS = (() => {
  const b = BODY, y0 = b.y, y1 = b.y + b.h;
  return [
    { z: -b.d * 0.500, top: y1 - 0.0022, bot: y0 + 0.0075, halfW: b.w * 0.402, r: b.round * 0.80 },
    { z: -b.d * 0.430, top: y1, bot: y0 + 0.0016, halfW: b.w * 0.482, r: b.round },
    { z: -b.d * 0.100, top: y1, bot: y0, halfW: b.w * 0.500, r: b.round },
    { z: b.d * 0.130, top: y1, bot: y0, halfW: b.w * 0.500, r: b.round },
    { z: b.d * 0.300, top: y1 - 0.0022, bot: y0 + b.noseDrop * 0.30, halfW: b.w * 0.490, r: b.round },
    { z: b.d * 0.425, top: y1 - 0.0070, bot: y0 + b.noseDrop * 0.68, halfW: b.w * 0.420, r: b.round * 0.90 },
    { z: b.d * 0.500, top: y1 - 0.0155, bot: y0 + b.noseDrop, halfW: b.noseW / 2, r: b.round * 0.70 },
  ];
})();

// ---------------------------------------------------------------------------
// the checks

// rule 1 — no two props may overlap, along the sides OR across the diagonal
for (let i = 0; i < MOTOR.length; i++) {
  for (let j = i + 1; j < MOTOR.length; j++) {
    const d = Math.hypot(MOTOR[i].x - MOTOR[j].x, MOTOR[i].z - MOTOR[j].z);
    if (d < PROP.R * 2 + 0.002)
      throw new Error(`params: motors ${i} and ${j} are ${(d * 1000).toFixed(0)}mm apart and the `
        + `props are ${(PROP.R * 2000).toFixed(0)}mm across — they would strike`);
  }
}
// rule 2 — the camera hangs clear of the props' plane. It is directly UNDER the front discs (all
// camera drones are), so the clearance that matters is vertical: the lens has to sit far enough
// below the disc that the blades are outside a wide lens's frame.
{
  const camY = BODY.y - GIMBAL.hangY;
  const discY = DECK + ARM.motorH + PROP.hubH * 0.5;
  if (camY > BODY.y - 0.010)
    throw new Error('params: the gimbal is inside the shell it hangs from');
  if (discY - camY < 0.045)
    throw new Error(`params: the camera is only ${((discY - camY) * 1000).toFixed(0)}mm under the `
      + 'prop disc — the blades would be in every frame');
}
if (BODY.legH < GIMBAL.hangY + GIMBAL.camH * 0.5)
  throw new Error('params: the legs are shorter than the gimbal — it lands on the camera');

// rule 4 — the battery pocket has to fit inside the shell it is cut into, with the wall left
// standing on both sides. A pocket wider than the moulding is a hole, not a bay.
if (BODY.bayW / 2 + FIT.wall + FIT.gap > BODY.w * 0.482)
  throw new Error('params: the battery bay is wider than the shell that holds it');
if (BODY.bayH + FIT.wall > DECK - PARTY)
  throw new Error('params: the battery bay cuts through the parting line');

// rule 5 — the shell must actually taper: a nose the width of the body is a brick, and the whole
// point of the wedge is that the camera looks past it.
if (BODY.noseW > BODY.w * 0.62)
  throw new Error('params: the nose is not narrower than the body — that is a brick, not an airframe');

// rule 6 — every station is above the ground and inside the shell, in order, nose last
STATIONS.reduce((prev, s) => {
  if (prev && s.z <= prev.z) throw new Error('params: shell stations must run tail to nose');
  if (s.bot < 0 || s.top > DECK + 1e-9) throw new Error(`params: station z=${s.z} escapes the shell`);
  if (s.top - s.bot < s.r * 2) throw new Error(`params: station z=${s.z} is thinner than its own fillet`);
  return s;
}, null);
