// typewriter — every dimension of a 1930s portable, in metres, in one place.
// Parts import their own slice and re-export it as `params` (D7), so the sheet shows what a
// part was built with and there is exactly one place to change a proportion.
//
// The three relationships that decide whether this reads as a typewriter or as a box with
// buttons are all arithmetic, and all of them are done here, not by nudging a screenshot:
//
//   1. type point   the bar tips and the ribbon must meet the platen at ONE point on its
//                   surface — TYPEBARS.typePoint is derived from the platen, never typed.
//   2. bar length   barLen = |typePoint − segment fulcrum|. Type it by hand and the tips
//                   either stop in mid air or pass through the roller.
//   3. key rake     the back row is 3 · rowRise higher and 3 · rowDepth deeper than the front
//                   row, and the front row must still clear the shell's front lip.

export const PALETTE = {
  lacquer: 0x14161a,         // black crinkle enamel — the body
  lacquerLit: 0x22262c,      // top faces, so the shell does not read as one black mass
  nickel: 0xc6ccd4,          // carriage furniture, rails, spools
  steelDark: 0x6a7078,       // type bars, segment
  keyBlack: 0x1b1d21,        // key caps
  keyRing: 0xd8dde3,         // the nickel ring around each cap
  keyFace: 0xf1ece2,         // the printed legend disc
  rubber: 0x2a2b2e,          // platen, feet
  paper: 0xf4f1e8,
  ribbon: 0x1a1520,
  gold: 0xb9932f,            // the maker's line on the front lip
};

export const BODY = {
  w: 0.300, h: 0.100, d: 0.245,
  round: 0.010,
  rearD: 0.150,              // the hood: full-height block at the back, carries the carriage
  apronH: 0.032,             // the low shelf in front of it — the keys stand in open air above it
  footR: 0.011, footH: 0.010, footInset: 0.032,
  wellW: 0.196,              // the opening the type bars come up through
  wellD: 0.100,
  wellZ: -0.005,             // sits far enough forward that the cut opens the hood's front face:
  wellDepth: 0.052,          //   a closed basket would hide the one part worth looking at
  sideRailW: 0.019,          // low rails down both sides of the apron: without them the apron
  sideRailH: 0.055,          //   reads as a separate slab lying in front of the machine
  cheekW: 0.012,             // the two side plates that carry the carriage rail
  cheekH: 0.038,
  cheekD: 0.056,
  railR: 0.0055,             // fixed to the frame — the carriage is what moves on it
  railSpan: 0.290,
  railRise: 0.030,
  railZ: -0.058,
  badgeW: 0.052,             // nickel maker's badge on the apron front
};

export const KEYBOARD = {
  rows: [11, 11, 11, 10],    // back (numbers) → front, in build order
  keyPitch: 0.0182,
  rowRise: 0.0100,           // per row, back is higher
  rowDepth: 0.0195,          // per row, back is deeper
  rowStagger: 0.0055,        // each row shifts right of the one behind it
  frontMargin: 0.030,        // front row centre, in from the body's front face
  frontY: 0.072,             // front row cap height above the floor
  capR: 0.0074, capH: 0.0048,
  capDish: 0.0010,           // the legend sits this far below the cap's top edge — any deeper and
  stalkR: 0.0022,            //   the nickel hoop hides it completely (found on the sheet)
  ringTube: 0.0009,          // the hoop is a torus, so the black cap shows between hoop and legend
  spaceW: 0.112, spaceD: 0.0125, spaceH: 0.0055,
  travel: 0.005,             // how far a pressed key sinks (main.js drives it)
};

export const CARRIAGE = {
  platenR: 0.0215,
  platenLen: 0.236,
  platenRise: 0.048,         // platen axis above the shell top
  platenZ: -0.014,           // and behind centre
  knobR: 0.0255, knobD: 0.011,
  bailR: 0.0042,             // the two little rollers that hold the sheet down
  bailRise: 0.030,
  tableW: 0.230, tableD: 0.062, tableTilt: 55,   // paper table, degrees UP FROM HORIZONTAL
  scaleH: 0.0045,
  travel: 0.120,             // full carriage stroke, ± travel/2 about centre
};

export const TYPEBARS = {
  count: 21,
  spread: 62,                // degrees either side of centre the fan covers
  fulcrumY: 0.058,           // segment fulcrum, in the well, below the platen
  fulcrumZ: 0.062,
  rest: 62,                  // degrees the bars hang back from the strike position. NOT a taste
                             //   value: the sweep in the review probe showed a 138mm bar can only
                             //   be got out of the platen's way and under the deck (y<0.110) at
                             //   58-64°; below 30° the tips end up inside the roller, and negative
                             //   angles throw the whole fan forward over the keyboard.
  barW: 0.0036, barT: 0.0016,
  headW: 0.0090, headH: 0.0075, headT: 0.0032,
  segmentR: 0.030,
  spoolR: 0.0195, spoolH: 0.0125, spoolX: 0.108, spoolZ: 0.010,   // ON the deck, outside
                             //   the well: down on the well floor the ribbon had to climb 100mm and
                             //   read as two scaffold struts across the basket
  ribbonW: 0.0115,
  typeAngle: 32,             // degrees round the platen from top-dead-centre, toward the front
};

export const PAPER = {
  w: 0.216,                  // US letter — must be shorter than CARRIAGE.platenLen
  wrapBack: 40,              // degrees of platen the sheet covers BEHIND top dead centre; the
                             //   front edge of the wrap is the type point itself, so the total
                             //   wrap is derived, not typed (see PAPER_WRAP below)
  rise: 0.115,               // how far the free end stands above the platen
  lean: 11,                  // degrees the free end leans back
  bow: 0.012,                // how far the top of the free end bows away — paper, not cardboard
  thick: 0.0004,
};

// ---------------------------------------------------------------------------
// derived — the numbers no part is allowed to retype

const shellTop = BODY.footH + BODY.h;
const rad = (d) => (d * Math.PI) / 180;

/** Platen axis in world (assembly) space. */
export const PLATEN = {
  y: shellTop + CARRIAGE.platenRise,
  z: CARRIAGE.platenZ,
};

/** The one point on the platen surface that the ribbon, the bar tips and the sheet all meet. */
export const TYPE_POINT = {
  y: PLATEN.y + CARRIAGE.platenR * Math.cos(rad(TYPEBARS.typeAngle)),
  z: PLATEN.z + CARRIAGE.platenR * Math.sin(rad(TYPEBARS.typeAngle)),
};

/** Bar length is the reach from the segment fulcrum to the type point — derived, never typed.
 *  A bar rotated to 0° puts its head exactly on the platen surface; `rest` swings it back. */
export const BAR_LEN = Math.hypot(
  TYPE_POINT.y - TYPEBARS.fulcrumY,
  TYPE_POINT.z - TYPEBARS.fulcrumZ,
);

/** Angle the raised bar makes with vertical, so the head can be squared up to the platen. */
export const BAR_LEAN = Math.atan2(
  TYPE_POINT.z - TYPEBARS.fulcrumZ,
  TYPE_POINT.y - TYPEBARS.fulcrumY,
);

/** The sheet starts exactly at the type point and wraps up over the roller. Both numbers come
 *  from the same place the bars aim at, so the paper cannot drift off the type line. */
export const PAPER_WRAP = {
  start: -(90 + PAPER.wrapBack),               // degrees, cylinder theta: 40° behind the top
  length: TYPEBARS.typeAngle + PAPER.wrapBack, // ends at the type point, 32° in front of the top
};

/** Which way the sheet feeds: up its own plane, leaning back with it. */
export const PAPER_FEED_DIR = {
  y: Math.cos((PAPER.lean * Math.PI) / 180),
  z: -Math.sin((PAPER.lean * Math.PI) / 180),
};

/** Every part of this machine is built in ONE coordinate system — y=0 is the desk, +Z is the
 *  front — so main.js adds them all at the origin and no offset can be got wrong. The price is
 *  that only `frame` is grounded; the rest declare `datum = 'mounted'`. Worth it: the type point
 *  has to be the same number in `carriage`, `typebars` and `paper`, and now it literally is. */
export const ASSEMBLY = {
  shellTop,
  keyFrontZ: BODY.d / 2 - KEYBOARD.frontMargin,
  trayY: BODY.footH + BODY.apronH,    // the keyboard tray floor the key stalks come out of
  wellFloorY: shellTop - BODY.wellDepth,
};

// Sanity, in code rather than in a comment: a sheet wider than the platen cannot be fed, and
// the front key row must not hang off the front of the machine.
if (PAPER.w >= CARRIAGE.platenLen) throw new Error('params: paper wider than platen');
if (ASSEMBLY.keyFrontZ + KEYBOARD.spaceD + KEYBOARD.capR > BODY.d / 2)
  throw new Error('params: keyboard overhangs the body front');
