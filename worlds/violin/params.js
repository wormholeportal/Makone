// violin — one full-size instrument, in metres, in one place.
//
// A violin is the one object here whose proportions are FIXED by the music rather than by taste:
//
//   1. the vibrating string is 325mm, nut to bridge, and it is split 2:3 — a 130mm neck stop and
//      a 195mm body stop. Move the bridge and the instrument is out of tune with itself, so the
//      bridge's position is DERIVED from the nut's, and the f-hole notches are placed on it.
//   2. the bridge and the nut carry the same curve (a 42mm radius), which is what lets a bow
//      reach one string at a time. Both are built from RADIUS, so the four strings sit on one
//      cylinder and the outer two cannot end up buried in the fingerboard.
//   3. the plates are ARCHED — 15mm on the top, 13mm on the back — and the arch is a surface, not
//      a bulge added afterwards: each plate is the outline scaled inward, ring by ring, lifted by
//      the arch function.
//
// The instrument lies on its back, neck toward +Z, so the studio's `top` view is the front.

export const PALETTE = {
  spruce: 0xc98c46,          // the top: fine-grained, warm under old varnish
  spruceLit: 0xe0a860,
  maple: 0xa9682f,           // back, ribs, neck — flamed
  mapleDark: 0x7d4a1e,
  ebony: 0x141317,           // fingerboard, pegs, tailpiece, nut is bone
  bone: 0xe6dfcc,
  purfling: 0x1a1a1e,
  string: 0xd8d5cc,
  stringWound: 0xb9a06a,
  varnishRim: 0x6b3a15,
};

export const BODY = {
  len: 0.3560,
  upper: 0.0840,             // half-widths
  waist: 0.0560,
  lower: 0.1040,
  ribH: 0.0300,
  archTop: 0.0150,
  archBack: 0.0130,
  edge: 0.0035,              // the overhang of the plates past the ribs
  purfW: 0.0016,
  rings: 14,                 // how many rings the arch is lofted in
  around: 96,                // points round the outline
};

/** Rule 1: the string length, and where it puts everything. */
export const SCALE = {
  vibrating: 0.3250,        // = neckStop + bodyStop, and the two are in the maker's 2:3
  neckStop: 0.1300,          // nut → the body's edge at the neck
  bodyStop: 0.1950,          // that edge → the bridge
  fingerboard: 0.2700,
  fbWidthNut: 0.0240, fbWidthEnd: 0.0420,
  fbThick: 0.0060,
};
if (Math.abs(SCALE.neckStop + SCALE.bodyStop - SCALE.vibrating) > 1e-9)
  throw new Error('params: the neck stop and the body stop do not add up to the string length');

// z coordinates, with the body's centre at z = 0
export const Z = {
  bodyTop: BODY.len / 2,                       // the edge the neck leaves from
  bodyBottom: -BODY.len / 2,
  bridge: BODY.len / 2 - SCALE.bodyStop,       // rule 1: derived, never typed
  nut: BODY.len / 2 + SCALE.neckStop,
  fbEnd: BODY.len / 2 + SCALE.neckStop - SCALE.fingerboard,
  scroll: BODY.len / 2 + SCALE.neckStop + 0.1050,
};

export const BRIDGE = {
  h: 0.0330, w: 0.0420, t: 0.0042,
  radius: 0.0420,            // rule 2 — the same curve as the nut
  strings: 4,
  spacing: 0.0113,           // between string centres at the bridge
};
export const NUT = {
  w: 0.0240, h: 0.0060, t: 0.0055,
  radius: BRIDGE.radius,     // rule 2, and it is literally the same number
  spacing: 0.0055,
};

export const FHOLE = {
  fromCentre: 0.0400,        // how far off the centre line the notches sit
  len: 0.0760,
  upperR: 0.0068, lowerR: 0.0082,
  waist: 0.0032,
};

export const NECK = {
  rootW: 0.0330, rootT: 0.0230,
  heelDrop: 0.0260,
  pegboxL: 0.0900, pegboxW: 0.0280, pegboxH: 0.0300,
  scrollR: 0.0230,
  pegR: 0.0055, pegLen: 0.0480, pegHeadR: 0.0110,
};

export const FITTINGS = {
  tailLen: 0.1120, tailW: 0.0330, tailT: 0.0090,
  tailGut: 0.0300,
  chinW: 0.0900, chinD: 0.0620, chinH: 0.0180,
  buttonR: 0.0075,
  stringR: 0.00048,
};

// ---------------------------------------------------------------------------
// the checks

// rule 2 — with one radius for both, the outer strings must still clear the fingerboard's edge
{
  const halfSpan = (BRIDGE.spacing * (BRIDGE.strings - 1)) / 2;
  if (halfSpan > BRIDGE.w / 2 - 0.004)
    throw new Error('params: the outer strings run off the sides of the bridge');
  const dropAtEdge = BRIDGE.radius - Math.sqrt(BRIDGE.radius ** 2 - halfSpan ** 2);
  if (dropAtEdge > 0.006)
    throw new Error(`params: a ${BRIDGE.radius * 1000}mm curve drops the outer strings `
      + `${(dropAtEdge * 1000).toFixed(1)}mm — a bow could not reach the middle two`);
}
// the bridge has to stand on the body, between the f-hole notches
if (Z.bridge > BODY.len / 2 - 0.020 || Z.bridge < -BODY.len / 2 + 0.020)
  throw new Error('params: the bridge is not standing on the belly');
// the fingerboard must reach past the body's edge but not to the bridge
if (Z.fbEnd < Z.bridge + 0.030)
  throw new Error('params: the fingerboard overhangs the bridge');
if (Z.fbEnd > Z.bodyTop)
  throw new Error('params: the fingerboard stops before it reaches the body');
