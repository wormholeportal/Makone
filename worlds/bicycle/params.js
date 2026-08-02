// bicycle — one 56cm steel road frame and its wheels, in metres, in one place.
//
// A bike is the clearest case in this repo of "do the arithmetic before any geometry": every
// tube end is a POINT, and the points are fixed by four measurements a frame builder would give
// you — wheelbase, bottom bracket drop, chainstay length, head angle. Nothing here is nudged.
//
//   1. the bottom bracket is not typed: it is where a chainstay of a given length reaches, given
//      the BB drop. BB.x = sqrt(chainstay² − drop²).
//   2. the fork crown is not typed either: the front axle is on the ground at the wheelbase, and
//      the crown is that point walked back UP the steering axis and back off the rake.
//   3. the cranks have to clear the ground at the bottom of the stroke, and the chainring has to
//      clear the chainstay. Both are inequalities, both checked at the bottom of this file.
//
// Everything downstream (spoke length, chain path, saddle height) reads these.

export const PALETTE = {
  frame: 0x9c1f2e,           // candy crimson over steel
  frameDeep: 0x6d1420,       // the shaded side of a round tube, in the lug shadows
  lug: 0xd8dde3,             // chromed lugs, crown and dropouts
  steel: 0xb9bfc7,           // polished alloy: cranks, bars, hubs
  steelDark: 0x6f757e,
  black: 0x191b1f,
  tyre: 0x23252a,
  gum: 0xa8794c,             // gum-wall sidewall — the one warm note on a cold machine
  saddle: 0x5a3520,          // leather
  tape: 0x1d1f24,            // bar tape
  chain: 0x8a8f97,
  spoke: 0xd2d7dd,
  brass: 0xb59139,
};

export const WHEEL = {
  rimR: 0.3110,              // 700c rim, outer edge of the braking surface
  rimDepth: 0.0280,          // a box-section rim: 28mm deep
  rimW: 0.0210,
  tyreR: 0.0125,             // 25mm tyre, as a torus of this minor radius
  spokes: 32,                // per wheel, three-cross, alternating sides
  cross: 3,
  hubR: 0.0170,
  hubW: 0.0520,
  flangeR: 0.0195,
  flangeGap: 0.0640,         // flange to flange, across the hub
  lockR: 0.0230,
  valveLen: 0.0330,
};
WHEEL.R = WHEEL.rimR + WHEEL.tyreR * 2 * 0.86;     // 0.332 — where the tyre actually meets the road

export const GEO = {
  wheelbase: 1.0050,
  drop: 0.0700,              // bottom bracket below the axle line
  chainstay: 0.4120,
  headAngle: 73.0,           // degrees from the ground
  seatAngle: 73.5,
  rake: 0.0470,              // fork offset, perpendicular to the steering axis
  forkLen: 0.3720,           // crown to axle, along the blade
  headTube: 0.1700,       // crown to the top of the head tube — the fork crown lives in the bottom 26mm
  seatTube: 0.5750,          // BB to the top of the seat cluster, centre to top
  postOut: 0.1550,           // how far the seat post stands out of the frame
  tubeTop: 0.0143,           // tube radii — a road frame is 28.6/31.8/25.4 nominal
  tubeDown: 0.0159,
  tubeSeat: 0.0143,
  tubeHead: 0.0175,
  stayTop: 0.0080,           // seat stays taper hard toward the dropouts
  stayBottom: 0.0058,
  chainstayR: 0.0105,
};

const rad = (d) => (d * Math.PI) / 180;

// ---- the points, derived in order ----
export const P = {};
P.rearAxle = [0, WHEEL.R];
P.frontAxle = [GEO.wheelbase, WHEEL.R];
P.bbY = WHEEL.R - GEO.drop;
// rule 1: the BB is where the chainstay reaches
P.bbX = Math.sqrt(GEO.chainstay ** 2 - GEO.drop ** 2);
P.bb = [P.bbX, P.bbY];

// rule 2: walk back up the steering axis from the front axle, then back off the rake
const a = rad(GEO.headAngle);
const axisUp = [-Math.cos(a), Math.sin(a)];                 // up-and-back along the steerer
const rakeDir = [Math.sin(a), Math.cos(a)];                 // perpendicular, pointing forward
P.crown = [
  P.frontAxle[0] + axisUp[0] * GEO.forkLen - rakeDir[0] * GEO.rake,
  P.frontAxle[1] + axisUp[1] * GEO.forkLen - rakeDir[1] * GEO.rake,
];
P.headTop = [P.crown[0] + axisUp[0] * GEO.headTube, P.crown[1] + axisUp[1] * GEO.headTube];
// the head tube does NOT start at the crown: the fork crown, its race and the lower headset cup
// all stack below it. Start the tube on the crown and there is nowhere for the front brake's
// barrel adjuster to be except inside the head tube — which is exactly where its cable vanished.
P.headBottom = [P.crown[0] + axisUp[0] * 0.0290, P.crown[1] + axisUp[1] * 0.0290];
P.axisUp = axisUp;

const s = rad(GEO.seatAngle);
P.seatTop = [P.bb[0] - Math.cos(s) * GEO.seatTube, P.bb[1] + Math.sin(s) * GEO.seatTube];
P.seatDir = [-Math.cos(s), Math.sin(s)];
P.saddleAt = [P.seatTop[0] + P.seatDir[0] * GEO.postOut, P.seatTop[1] + P.seatDir[1] * GEO.postOut];

// where the tubes meet the head tube: the top tube just under the top, the down tube just over
// the crown. A frame whose tubes meet the ENDS of the head tube reads as a bicycle-shaped wire.
P.topAtHead = [P.headTop[0] - axisUp[0] * 0.022, P.headTop[1] - axisUp[1] * 0.022];
P.downAtHead = [P.headBottom[0] + axisUp[0] * 0.014, P.headBottom[1] + axisUp[1] * 0.014];
P.topAtSeat = [P.seatTop[0] + P.seatDir[0] * -0.014, P.seatTop[1] + P.seatDir[1] * -0.014];

// ---- where the fittings go: everything a cable, a bottle or a shifter bolts to ----
// These are POINTS ON A TUBE, given as a fraction of that tube's run, so a fitting cannot end up
// floating beside the tube it is supposed to be clamped to.
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit2 = (a, b) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(dx, dy);
  return [dx / L, dy / L];
};
P.downDir = unit2(P.bb, P.downAtHead);                      // up the down tube, toward the head
P.downNormal = [-P.downDir[1], P.downDir[0]];               // out of the down tube, INTO the triangle
P.topDir = unit2(P.topAtHead, P.topAtSeat);
P.chainstayDir = unit2(P.bb, P.rearAxle);

P.shifterAt = lerp2(P.bb, P.downAtHead, 0.76);              // down tube shifters, where a thumb finds them
P.cageAt = lerp2(P.bb, P.downAtHead, 0.34);                 // bottle cage bolts
P.topStopFront = lerp2(P.topAtHead, P.topAtSeat, 0.10);     // rear brake housing stops
P.topStopRear = lerp2(P.topAtHead, P.topAtSeat, 0.70);
P.bbGuide = [P.bb[0] + 0.004, P.bb[1] - 0.0215];            // the plastic guide under the BB shell
P.fdAt = [P.bb[0] - Math.cos(s) * 0.150, P.bb[1] + Math.sin(s) * 0.150];   // front mech clamp band

export const DRIVE = {
  crank: 0.1725,
  chainringTeeth: 52,
  chainringR: 0.1060,        // 52t at ½" pitch: r = 12.7·52 / 2π ≈ 105mm
  innerTeeth: 39,
  innerR: 0.0795,
  ringT: 0.0022,
  cogs: [0.0570, 0.0520, 0.0472, 0.0428, 0.0388, 0.0352, 0.0320, 0.0292],   // 11-28, 8 sprockets
  cogT: 0.0016,
  cogGap: 0.0048,
  chainW: 0.0072,
  chainT: 0.0031,
  pedalW: 0.0640, pedalD: 0.0880, pedalT: 0.0140,
  qFactor: 0.0740,           // crank arm plane, each side of centre
};
DRIVE.cassetteZ = -WHEEL.flangeGap / 2 - 0.012;             // outboard of the rear hub's flange

// A chain is a string of these. ½" pitch is the one dimension every bicycle on earth shares.
export const CHAIN = {
  pitch: 0.0127,
  rollerR: 0.0037,
  rollerW: 0.0076,
  plateH: 0.0074,
  plateT: 0.0009,
  outerZ: 0.0043,            // outer plate, half-gauge from the roller's centre plane
  innerZ: 0.0029,
};

export const CABLE = {
  housingR: 0.0026,          // outer casing
  wireR: 0.0009,             // the bare inner, where it runs along the top tube
  ferruleR: 0.0033,
  ferruleL: 0.0090,
};

export const HEADSET = {
  cupR: 0.0225,
  cupH: 0.0125,
  spacer: 0.0055,
  stack: 2,                  // spacers under the stem
};

export const COCKPIT = {
  stemLen: 0.1050,
  stemDrop: 6,               // degrees below horizontal
  stemR: 0.0140,
  barW: 0.4200,              // hood to hood, outside
  barDrop: 0.1280,           // top of the bar to the bottom of the drop
  barReach: 0.0870,
  barR: 0.0119,
  saddleL: 0.2700,
  saddleW: 0.1450,
  saddleH: 0.0480,
  bottleH: 0.2100,
};

// ---- the points the CONTROLS need: where a cable leaves a lever and where it lands ----
// The cockpit and the cables are separate parts and must agree to the millimetre about where a
// brake lever is. They agree because neither of them decides — this file does.
const stemDir = [Math.cos(-rad(COCKPIT.stemDrop)), Math.sin(-rad(COCKPIT.stemDrop))];
P.steerTop = [P.headTop[0] + axisUp[0] * 0.050, P.headTop[1] + axisUp[1] * 0.050];
P.barCentre = [P.steerTop[0] + stemDir[0] * COCKPIT.stemLen,
  P.steerTop[1] + stemDir[1] * COCKPIT.stemLen];
P.hoodAt = [P.barCentre[0] + COCKPIT.barReach * 0.80, P.barCentre[1] - 0.030];   // z = ±barW/2
P.hoodTilt = -0.34;
// the housing leaves the back of the hood, which is that point turned by the hood's own lean
P.cableOut = [
  P.hoodAt[0] - 0.0280 * Math.cos(P.hoodTilt) - 0.0100 * Math.sin(P.hoodTilt),
  P.hoodAt[1] - 0.0280 * Math.sin(P.hoodTilt) + 0.0100 * Math.cos(P.hoodTilt),
];

// the two brake mounts, and the barrel adjuster on top of each caliper
P.stayDir = unit2(P.rearAxle, P.seatTop);
P.brakeRear = [P.rearAxle[0] + P.stayDir[0] * (WHEEL.R + 0.0120),
  P.rearAxle[1] + P.stayDir[1] * (WHEEL.R + 0.0120)];
// the front caliper bolts through the crown but hangs IN FRONT of it, which is the only reason a
// front brake cable has anywhere to go
const frontUp = unit2(P.frontAxle, P.crown);
const frontFwd = [frontUp[1], -frontUp[0]];
P.brakeFront = [P.crown[0] + frontFwd[0] * 0.0135, P.crown[1] + frontFwd[1] * 0.0135];
const fDir = unit2(P.frontAxle, P.brakeFront);
P.brakeRearTop = [P.brakeRear[0] + P.stayDir[0] * 0.0290, P.brakeRear[1] + P.stayDir[1] * 0.0290];
P.brakeFrontTop = [P.brakeFront[0] + fDir[0] * 0.0290, P.brakeFront[1] + fDir[1] * 0.0290];

// ---------------------------------------------------------------------------
// the checks

if (Math.abs(Math.hypot(P.bb[0] - P.rearAxle[0], P.bb[1] - P.rearAxle[1]) - GEO.chainstay) > 1e-9)
  throw new Error('params: the bottom bracket is not a chainstay away from the rear axle');
if (Math.abs(Math.hypot(P.crown[0] - P.frontAxle[0], P.crown[1] - P.frontAxle[1]) - Math.hypot(GEO.forkLen, GEO.rake)) > 1e-9)
  throw new Error('params: the fork crown does not reach the front axle');

// rule 3a — the pedal at the bottom of the stroke must not be underground
if (P.bbY - DRIVE.crank <= 0.010)
  throw new Error(`params: the cranks hit the ground (${((P.bbY - DRIVE.crank) * 1000).toFixed(1)}mm clearance)`);
// rule 3b — the big ring must clear the chainstay it runs alongside
if (DRIVE.chainringR > GEO.chainstay * 0.42)
  throw new Error('params: the chainring is too big for the chainstay to pass');
// the rear wheel must clear the seat tube
if (P.bb[0] - WHEEL.R < 0.004)
  throw new Error('params: the rear wheel eats the bottom bracket');
