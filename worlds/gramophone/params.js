// gramophone — every dimension of the machine, in metres, in one place.
// Parts import their own slice and re-export it as `params`, so the studio can show
// what it built with and there is exactly one place to change a proportion (D7).

export const PALETTE = {
  woodBody: 0x4a2c19,        // mahogany case, oiled
  woodTop: 0x633c22,         // lighter top plate, catches the key light
  woodTrim: 0x35200f,        // moulding shadow line
  brass: 0xb28a3c,           // the horn — the one thing that must sing
  brassDark: 0x6d5321,
  steel: 0x8d939c,
  felt: 0x2c6349,            // green platter felt
  record: 0x121216,
  label: 0xb03b2c,
};

export const CABINET = {
  w: 0.340, h: 0.235, d: 0.340,
  round: 0.009,              // edge fillet — CSG rounded box, not a chamfer (solid scar rule 2)
  topThick: 0.016,
  topOverhang: 0.012,
  trimThick: 0.010,
  trimDrop: 0.030,           // moulding sits this far below the top plate
  footR: 0.027,
  footH: 0.028,
  footInset: 0.040,
  grilleSlats: 5,
  grilleW: 0.150,
  grilleH: 0.105,
  crankBossR: 0.021,
};

export const TURNTABLE = {
  platterR: 0.140,
  platterH: 0.013,
  feltR: 0.133,
  feltH: 0.0025,
  recordR: 0.125,
  recordH: 0.0028,
  labelR: 0.043,
  spindleR: 0.0035,
  spindleH: 0.028,
  grooves: 34,               // drawn into a generated canvas, not a downloaded texture (D4)
};

export const HORN = {
  throatR: 0.021,
  bellR: 0.200,
  length: 0.420,
  flare: 2.4,                // r(t) = throat + (bell - throat) * t^flare — the horn's whole character
  rimRoll: 0.011,
  tilt: 18,                  // degrees the bell leans forward, off the elbow
  elbowRise: 0.115,
  elbowReach: 0.030,
  wall: 0.0025,
  segments: 64,
};

export const TONEARM = {
  postR: 0.014,
  postH: 0.075,              // tall enough that a sloping arm still lands ON the record, not through it
  armR: 0.007,
  armLen: 0.185,             // post sits 0.184 from the platter centre — the arm just reaches across
  armDrop: 7.5,              // degrees: postH - armLen*sin(drop) must equal record height + needle drop
  headW: 0.042,
  headH: 0.042,
  headD: 0.018,
  needleLen: 0.014,
  swing: -0.20,              // radians about the post: puts the needle on the outer grooves
};

export const CRANK = {
  shaftR: 0.006,
  shaftLen: 0.070,
  throw: 0.062,              // offset of the handle from the shaft axis
  handleR: 0.011,
  handleLen: 0.052,
};

/** Where each part sits on the assembled machine (main.js is the only consumer). */
export const ASSEMBLY = {
  cabinetTop: CABINET.footH + CABINET.h + CABINET.topThick,
  platterAt: [0, 0, 0.020],
  hornAt: [0, 0, -0.120],
  tonearmAt: [0.132, 0, -0.108],
  crankAt: [CABINET.w / 2, CABINET.footH + CABINET.h * 0.55, 0.02],
};
