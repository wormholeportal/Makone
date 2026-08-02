// camera — one 35mm SLR, in metres, in one place.
//
// Five things make this an SLR rather than a black box with a tube on it, and three of them
// are arithmetic rather than taste:
//
//   1. the light path is a straight line and then a right angle: the lens axis, the mirror box
//      and the prism all sit on x = 0, and the eyepiece leaves the BACK at the prism's own
//      mid-height. EYEPIECE.y is derived from PRISM, never typed.
//   2. the prism has to be tall enough to stand over the mount throat, or the finder would look
//      into the top plate. asserted below.
//   3. the wind lever sweeps over the top plate and must clear the prism at rest and stay inside
//      the body at the end of its throw — two inequalities, both checked here.
//
// The remaining two are form, not numbers: the trapezoid hump, and a barrel that is all rings.

export const PALETTE = {
  chrome: 0xc6c9cf,          // satin plated brass — the top and bottom plates
  chromeBright: 0xe2e6ea,    // turned edges and the shutter button
  chromeDark: 0x7e848c,
  black: 0x1a1c20,           // painted alloy
  leather: 0x26282c,         // vulcanite body covering
  glassCoat: 0x14384a,       // the coated front element: a blue reflection, not a hole
  glassDeep: 0x2a1c10,       // the element behind it, amber
  red: 0xb2372c,             // the mount index dot, and 'A' on the counter
  ivory: 0xe8e3d8,
};

export const BODY = {
  w: 0.142,
  d: 0.038,
  topH: 0.0145,              // chrome top plate
  leatherH: 0.0500,          // vulcanite band
  baseH: 0.0105,             // chrome bottom plate
  round: 0.0060,
  inset: 0.0009,             // the covering sits inside the plates by this much, all round
  endRound: 0.0165,          // the ends are a stadium in plan, not a fillet on a box
};
BODY.h = BODY.baseH + BODY.leatherH + BODY.topH;      // 0.075 — the body without its hump

export const MOUNT = {
  axisY: 0.0405,             // lens axis above the baseplate
  flangeR: 0.0235,
  flangeT: 0.0035,
  throatR: 0.0202,
  throatDepth: 0.0150,
  lugs: 3,                   // bayonet claws, visible inside the throat
  indexR: 0.0022,
};

export const PRISM = {
  w0: 0.0400, d0: 0.0330,    // where it meets the top plate
  w1: 0.0250, d1: 0.0170,    // the ridge
  h: 0.0205,
  dz: -0.0035,               // the ridge leans back toward the eye
  z: 0.0010,                 // the hump's centre, in z, on the top plate
  shoeW: 0.0210, shoeD: 0.0180, shoeH: 0.0032,
};
PRISM.baseY = BODY.h;                                  // it stands on the top plate
PRISM.apexY = PRISM.baseY + PRISM.h;

export const EYEPIECE = {
  w: 0.0250, h: 0.0175, t: 0.0040,
  y: PRISM.baseY + PRISM.h * 0.48,                     // rule 1: on the prism's own centre line
  glassInset: 0.0012,
};

export const LENS = {
  // every ring is [outer radius, length]; they stack forward from the mount face.
  // The profile has ONE waist and it is the focus ring: collar → aperture → scale → focus →
  // bezel goes 22.8 → 28.4 → 27.2 → 32.2 → 30.0, so the hand's ring is the fattest and the
  // filter ring steps back in. An aperture ring wider than the bezel (it was, by 0.4mm) makes
  // the barrel read as a stack of unrelated discs.
  collarR: 0.0228, collarL: 0.0060,                    // the bayonet collar, plain
  apertureR: 0.0284, apertureL: 0.0118,                // scalloped grip at the back, stops in front
  scaleR: 0.0272, scaleL: 0.0115,                      // the printed depth-of-field scale
  focusR: 0.0322, focusL: 0.0190,                      // the big knurled ring, turns
  bezelR: 0.0300, bezelL: 0.0074,                      // the filter ring
  filterR: 0.0268,                                     // ø53.6 filter thread, sunk in the bezel
  glassR: 0.0250,
  glassSag: 0.0042,                                    // how far the front element bulges
  // A grip is specified by PITCH — the arc between crests — never by a tooth count. 46 flutes
  // on a ø64 ring is a 4.4mm pitch, and that is a sprocket, not a lens: it is what made the
  // focus ring read as a gear. Rolled knurling is 0.8–1.5mm; milled scallops are 2–4mm.
  knurlPitch: 0.00130, knurlDepth: 0.00050,            // focus ring: fine, rolled
  gripPitch: 0.00320, gripDepth: 0.00065,              // aperture ring: coarse, milled
  stops: ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16'],
  distances: ['∞', '10', '5', '3', '2', '1.5', '1', '0.7', '0.45'],
  name: ['50mm', '1:1.4'],                             // engraved round the filter ring
};
LENS.z0 = BODY.d / 2 + MOUNT.flangeT;                  // the mount face: where the lens begins
LENS.length = LENS.collarL + LENS.apertureL + LENS.scaleL + LENS.focusL + LENS.bezelL;

export const CONTROLS = {
  windPivotX: 0.0455, windPivotZ: -0.0068,             // the advance lever's post, on the top plate
  windLen: 0.0250,                                     // pivot to the tip of the thumb rest
  windRest: -25,                                       // degrees: parked over the back-right corner
  windThrow: 142,                                      // degrees of one full stroke
  // 41mm of lever was the first guess and rule 3a caught it: the tip stood 24mm off the back of
  // a 38mm-deep body. An advance lever is a thumb's arc, not an arm's.
  windThick: 0.0028,
  dialR: 0.0098, dialH: 0.0072,                        // shutter speeds
  dialX: 0.0330,
  buttonR: 0.0037, buttonH: 0.0030,
  buttonX: 0.0455,
  rewindR: 0.0092, rewindH: 0.0060,                    // rewind knob, left end
  rewindX: -0.0470,
  // The counter is a WINDOW: it has to be somewhere a thumb is not and an eye can reach. It sat
  // at x=25mm on the dial's own z, which put ø13.6 of it under a ø19.6 dial — all that showed
  // was a black crescent peeking out from under the speeds. It lives in front of the dial now,
  // and rule 6 keeps it there.
  counterR: 0.0058,
  counterX: 0.0260,
  counterZ: 0.0090,
  knurlPitch: 0.00110, knurlDepth: 0.00040,            // dials and knobs, by pitch (see LENS)
  speeds: ['B', '1', '2', '4', '8', '15', '30', '60', '125', '250', '500', '1000'],
  timerLen: 0.0180,                                    // self-timer lever on the front plate
};

// ---------------------------------------------------------------------------
// the three checks

// rule 2 — the finder has to see over the throat
if (PRISM.apexY <= MOUNT.axisY + MOUNT.throatR)
  throw new Error('params: the prism is shorter than the mount throat it has to look over');

// rule 3a — parked, the lever tip must stay inside the body outline
{
  const a = (CONTROLS.windRest * Math.PI) / 180;
  const tipX = CONTROLS.windPivotX + CONTROLS.windLen * Math.cos(a);
  const tipZ = CONTROLS.windPivotZ + CONTROLS.windLen * Math.sin(a);
  if (Math.abs(tipX) > BODY.w / 2 - 0.001 || Math.abs(tipZ) > BODY.d / 2 - 0.001)
    throw new Error(`params: the parked wind lever hangs off the body (${tipX.toFixed(4)}, ${tipZ.toFixed(4)})`);
  // rule 3b — swung out, it must not sweep through the prism
  const b = a + (CONTROLS.windThrow * Math.PI) / 180;
  const endX = CONTROLS.windPivotX + CONTROLS.windLen * Math.cos(b);
  if (endX < PRISM.w0 / 2)
    throw new Error('params: the wind lever ends its throw inside the pentaprism');
}

// the lens must actually land on the mount, not near it
if (LENS.collarR > MOUNT.flangeR)
  throw new Error('params: the lens collar is wider than the flange it seats on');

// rule 4 — the barrel has one waist, and it is where the hand goes
if (LENS.focusR <= Math.max(LENS.apertureR, LENS.bezelR))
  throw new Error('params: the focus ring is not the widest ring on the barrel');

// rule 5 — the front is a real filter ring: the thread clears the element and still leaves a lip
if (LENS.filterR <= LENS.glassR + 0.0010 || LENS.filterR >= LENS.bezelR - 0.0020)
  throw new Error('params: the filter thread does not fit between the front element and the bezel');

// rule 6 — the frame counter is a window, so nothing may be parked on top of it
{
  const gap = Math.hypot(CONTROLS.counterX - CONTROLS.dialX, CONTROLS.counterZ - CONTROLS.windPivotZ);
  if (gap < CONTROLS.counterR + CONTROLS.dialR + 0.0012)
    throw new Error(`params: the frame counter is under the shutter dial (${(gap * 1000).toFixed(1)}mm apart)`);
  if (CONTROLS.counterX - CONTROLS.counterR < PRISM.w0 / 2)
    throw new Error('params: the frame counter runs into the pentaprism');
}
