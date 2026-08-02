// body — the moulded airframe: an upper and a lower shell that meet on a parting line, a battery
// that slides into the tail, the sensor suite in the nose, and four legs.
// Datum: y=0 is the ground; the aircraft stands on its own legs.
//
// The shell is ONE lofted solid (params' STATIONS) with every feature CUT into it, never stuck
// onto it: the parting groove runs round the whole body at a constant height, the intake louvers
// are slots THROUGH the wall with the dark interior showing behind, the battery sits in a pocket
// with half a millimetre of gap all round, the screws sit in counterbores. That distinction —
// cut, not applied — is most of what separates a moulded product from a stack of boxes.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { BODY, DECK, PARTY, FIT, MOTOR, STATIONS, PALETTE } from '../params.js';
import * as S from '../shapes.js';

export const params = BODY;

export const inventory = [
  `shell ${params.w * 1000}×${params.h * 1000}×${params.d * 1000}mm lofted through `
    + `${STATIONS.length} sections — flat deck, rising belly, ${params.noseW * 1000}mm nose`,
  `an upper and a lower moulding meeting on a ${FIT.groove * 1000}mm parting line at `
    + `y = ${Math.round(PARTY * 1000)}mm, level the whole way round`,
  `battery ${params.bayW * 1000}×${params.bayD * 1000}mm in a pocket cut into the tail, flush with `
    + `the deck, ${FIT.gap * 1000}mm of gap on every side, two latches and a four-cell charge bar`,
  `${params.vents} intake louvers a side, cut THROUGH the wall — you see the dark inside, not a `
    + 'black rectangle painted on grey',
  'nose: two stereo obstacle cameras in recessed sockets, an infrared window between them, and '
    + 'the forward LED in a moulded slot',
  `it stands on four ${params.legH * 1000}mm legs with rubber feet, the rear pair carrying the `
    + 'aerial blades',
  `M2 fasteners with hex sockets, six of them, each in a ${FIT.screwHead * 2000}mm counterbore`,
];

/** The shell — cut once, then split in two.
 *
 *  An airframe this size is two mouldings that meet on a seam, and the seam is the single loudest
 *  signal that a thing was manufactured. So every feature is cut into ONE solid (so the louvers
 *  and the hatch line up across the joint), and only then is the solid sliced at the parting
 *  height into an upper and a lower half with the seam's width between them. The dark interior
 *  shows through that gap, exactly as it does on the real thing.
 *
 *  @returns [upper, lower] geometries. */
function shellGeo() {
  const b = BODY;
  // the leg bosses are UNIONED INTO the lower moulding before anything is cut — a leg that
  // bolts to a lump stuck under the belly is two parts; a leg that grows out of the shell is one
  const shell = MOTOR.reduce((solid, m) => {
    const sx = Math.sign(m.x), sz = Math.sign(m.z);
    const x0 = sx * b.w * 0.395, z0 = sz * b.d * 0.275;
    return solid.add(MK.hull(
      S.rb(0.0175, 0.0090, 0.0290, 0.0038, 16, [x0 - sx * 0.0080, b.y + 0.0090, z0]),
      S.rb(0.0125, 0.0055, 0.0175, 0.0026, 16, [x0 + sx * 0.0018, b.y - 0.0038, z0])));
  }, S.loft(STATIONS, 0, 26));
  const skin = S.loft(STATIONS, FIT.grooveD, 26);      // stops a groove at panel-line depth
  const cuts = [];

  // ---- battery pocket: open at the tail, flush at the deck, half a millimetre of gap ----
  const bayZ = -b.d / 2 + b.bayD / 2 + 0.0010;
  const front = bayZ + b.bayD / 2 + FIT.gap, back = -b.d / 2 - 0.0120;
  cuts.push(S.rb(b.bayW + FIT.gap * 2, b.bayH * 2, front - back, 0.0035, 14,
    [0, DECK, (front + back) / 2]));

  // ---- intake louvers, both flanks, angled, straight through the wall ----
  for (const sx of [-1, 1])
    for (let i = 0; i < b.vents; i++)
      cuts.push(MK.cube(0.0140, 0.0150, 0.0026).rotate([16, 0, 0])
        .translate([sx * b.w * 0.46, PARTY + 0.0092, -0.0250 - i * 0.0074]));
  // and the exhaust across the tail deck
  for (let i = 0; i < 4; i++)
    cuts.push(MK.cube(0.0300, 0.0120, 0.0026).translate([0, DECK, 0.0060 - i * 0.0068]));

  // ---- the nose: two sensor sockets, an infrared window, and the LED slot ----
  const noseZ = b.d * 0.478;
  for (const sx of [-1, 1])
    cuts.push(S.rb(0.0158, 0.0134, 0.0130, 0.0028, 14, [sx * 0.0126, b.y + b.h * 0.60, noseZ]));
  cuts.push(S.cylZ(0.0130, 0.0050, 0.0050, 20, [0, b.y + b.h * 0.60, noseZ]));
  cuts.push(S.rb(0.0230, 0.0044, 0.0100, 0.0016, 12, [0, b.y + b.h * 0.28, noseZ]));

  // ---- the service hatch on the belly, and the six screws round it ----
  const [hw, hd, hz] = [0.0470, 0.0740, -0.0120];
  for (const sz of [1, -1])
    cuts.push(MK.cube(hw, 0.0090, FIT.groove).translate([0, b.y, hz + sz * hd / 2]).subtract(skin));
  for (const sx of [1, -1])
    cuts.push(MK.cube(FIT.groove, 0.0090, hd).translate([sx * hw / 2, b.y, hz]).subtract(skin));
  for (const at of SCREW_AT) cuts.push(S.screwSeat(FIT.screwR, FIT.screwHead, 0.0060, at, 'y'));

  // ---- the port bay on the left flank: USB-C and a card slot, under one recess ----
  cuts.push(S.rb(0.0070, 0.0116, 0.0260, 0.0020, 12, [-b.w * 0.47, PARTY - 0.0082, 0.0175]));

  // ---- and the two moulded seams that run the length of the deck ----
  for (const sx of [-1, 1])
    cuts.push(MK.cube(FIT.groove, 0.0120, b.d * 0.60).translate([sx * 0.0255, DECK, b.d * 0.10]).subtract(skin));

  const half = (sign) => S.csg(
    () => cuts.reduce((solid, c) => solid.subtract(c), shell)
      .intersect(MK.cube(b.w * 3, b.h * 3, b.d * 3)
        .translate([0, PARTY + sign * (b.h * 1.5 + FIT.groove / 2), 0])),
    () => MK.rbGeo(b.w, sign > 0 ? b.h * 0.58 : b.h * 0.42, b.d, b.round).clone()
      .translate(0, sign > 0 ? PARTY + b.h * 0.29 : PARTY - b.h * 0.21, 0),
    36);
  return [half(1), half(-1)];
}

/** Where the belly screws go — the cut and the fastener have to agree, so they read it here. */
const SCREW_AT = (() => {
  const at = [];
  for (const sx of [-1, 1]) for (const dz of [-0.0480, -0.0120, 0.0240]) at.push([sx * 0.0192, BODY.y + 0.0013, dz]);
  return at;
})();

/** One M2 cap screw: head, hex socket, shank. Built once, instanced everywhere (E4). */
function screwGeo() {
  return S.csg(
    () => MK.union(
      S.cylY(0.0022, FIT.screwHead * 0.92, FIT.screwHead * 0.92, 20, [0, -0.0011, 0]),
      S.cylY(0.0050, FIT.screwR * 0.90, FIT.screwR * 0.90, 12, [0, -0.0045, 0]))
      .subtract(S.cylY(0.0018, 0.0011, 0.0011, 6, [0, -0.0003, 0])),
    () => new THREE.CylinderGeometry(FIT.screwHead * 0.9, FIT.screwHead * 0.9, 0.0022, 16),
    30);
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'body';

  const shell = new THREE.MeshPhysicalMaterial({
    color: PALETTE.shell, roughness: 0.46, metalness: 0.18,
    clearcoat: 0.35, clearcoatRoughness: 0.42, envMapIntensity: 1.0 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.shellDark, roughness: 0.56, metalness: 0.24 });
  const carbon = new THREE.MeshPhysicalMaterial({
    color: PALETTE.carbon, roughness: 0.30, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.10 });
  const black = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.62, metalness: 0.15 });
  const rubber = new THREE.MeshStandardMaterial({ color: PALETTE.rubber, roughness: 0.92, metalness: 0.02 });
  const alu = new THREE.MeshStandardMaterial({ color: PALETTE.alu, roughness: 0.30, metalness: 0.94 });
  const steel = new THREE.MeshStandardMaterial({ color: PALETTE.aluDark, roughness: 0.24, metalness: 0.96 });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.30, metalness: 0.95 });
  const led = new THREE.MeshStandardMaterial({
    color: PALETTE.led, emissive: PALETTE.led, emissiveIntensity: 1.1, roughness: 0.35 });
  const ledRed = new THREE.MeshStandardMaterial({
    color: PALETTE.ledRed, emissive: PALETTE.ledRed, emissiveIntensity: 0.9, roughness: 0.35 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: PALETTE.lens, roughness: 0.05, metalness: 0.85, envMapIntensity: 2.2,
    clearcoat: 1, clearcoatRoughness: 0.02 });

  // ---- the two shells, and the dark interior the louvers and the seam look into ----
  const [upperGeo, lowerGeo] = shellGeo();
  const upper = new THREE.Mesh(upperGeo, shell);
  const lower = new THREE.Mesh(lowerGeo, new THREE.MeshPhysicalMaterial({
    color: PALETTE.shellLip, roughness: 0.52, metalness: 0.20,
    clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 1.0 }));
  upper.castShadow = upper.receiveShadow = true;
  lower.castShadow = lower.receiveShadow = true;
  g.add(upper, lower);
  // It sits one wall thickness under the skin, so a louver reads as a slot with a shadow in it —
  // and it stops short of the nose, or it would fill the sensor pockets from behind.
  const inner = new THREE.Mesh(
    S.csg(
      () => S.loft(STATIONS, FIT.wall, 16)
        .intersect(MK.cube(p.w, p.h, p.d).translate([0, p.y + p.h / 2, -p.d / 2 + 0.0600])),
      () => new THREE.BoxGeometry(0.001, 0.001, 0.001), 40),
    new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.95, metalness: 0.0 }));
  g.add(inner);

  // ---- battery: the pocket's shape less the gap, so the panel line reads all the way round ----
  const bayZ = -p.d / 2 + p.bayD / 2 + 0.0010;
  const cell = new THREE.Mesh(
    S.csg(
      () => S.rb(p.bayW, p.bayH * 2, p.bayD, 0.0035, 16, [0, DECK, bayZ])
        .subtract(MK.cube(p.bayW * 2, p.bayH * 2, p.bayD * 2).translate([0, DECK + p.bayH, bayZ]))
        // the finger scallop you pull it out by
        .subtract(S.cylX(p.bayW * 2, 0.0072, 0.0072, 20, [0, DECK - 0.0016, -p.d / 2 + 0.0020])),
      () => MK.rbGeo(p.bayW, p.bayH, p.bayD, 0.0035),
      36),
    dark);
  cell.castShadow = cell.receiveShadow = true;
  g.add(cell);
  // the charge bar, in the tail face
  g.add(S.repeat(new THREE.BoxGeometry(0.0078, 0.0022, 0.0016), led, [0, 1, 2, 3].map((i) => ({
    at: [-0.0141 + i * 0.0094, DECK - p.bayH * 0.62, -p.d / 2 + 0.0010] })), { shadow: false }));
  // and the two latches, one each flank
  const latchGeo = S.csg(() => S.rb(0.0042, 0.0092, 0.0190, 0.0016, 12),
    () => new THREE.BoxGeometry(0.0042, 0.0092, 0.0190), 34);
  g.add(S.repeat(latchGeo, black, [-1, 1].map((sx) => ({
    at: [sx * (p.bayW / 2 - 0.0006), DECK - p.bayH * 0.46, bayZ - p.bayD * 0.22] }))));
  // the gold blade contacts, deep in the bay where the battery meets the airframe
  g.add(S.repeat(new THREE.BoxGeometry(0.0026, 0.0060, 0.0012), gold, [-1, 0, 1].map((i) => ({
    at: [i * 0.0090, DECK - p.bayH * 0.5, bayZ + p.bayD / 2 - 0.0014] })), { shadow: false }));

  // ---- nose sensors: a socket, a coated element, an infrared window ----
  const noseZ = p.d * 0.478;
  const camY = p.y + p.h * 0.60;
  g.add(S.repeat(new THREE.CylinderGeometry(0.0052, 0.0060, 0.0070, 24).rotateX(Math.PI / 2), black,
    [-1, 1].map((sx) => ({ at: [sx * 0.0126, camY, noseZ + 0.0006] })), { shadow: false }));
  g.add(S.repeat(new THREE.SphereGeometry(0.0080, 24, 12, 0, Math.PI * 2, 0, 0.60), glass,
    [-1, 1].map((sx) => ({ at: [sx * 0.0126, camY, noseZ - 0.0034], rot: [Math.PI / 2, 0, 0] })), { shadow: false }));
  const ir = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.0022, 24).rotateX(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x1c0f12, roughness: 0.10, metalness: 0.5, clearcoat: 1, envMapIntensity: 1.5 }));
  ir.position.set(0, camY, noseZ + 0.0022);
  g.add(ir);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.0200, 0.0028, 0.0034), ledRed);
  strip.position.set(0, p.y + p.h * 0.28, noseZ + 0.0004);
  g.add(strip);

  // ---- the GPS puck on the deck ----
  const gps = new THREE.Mesh(
    S.csg(() => S.rb(0.0330, 0.0062, 0.0290, 0.0026, 16, [0, DECK + 0.0016, 0.0330]),
      () => MK.rbGeo(0.0330, 0.0062, 0.0290, 0.0026), 34),
    dark);
  gps.castShadow = true;
  g.add(gps);
  const gpsLed = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0009, 16), led);
  gpsLed.position.set(0, DECK + 0.0046, 0.0330);
  g.add(gpsLed);

  // ---- the port bay: USB-C and a card slot, inside the flank recess ----
  const usb = new THREE.Mesh(
    S.csg(() => S.rb(0.0028, 0.0034, 0.0096, 0.0014, 12), () => new THREE.BoxGeometry(0.0028, 0.0034, 0.0096), 30),
    steel);
  usb.position.set(-p.w * 0.466, PARTY - 0.0082, 0.0245);
  g.add(usb);
  const sd = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0024, 0.0125), black);
  sd.position.set(-p.w * 0.466, PARTY - 0.0082, 0.0100);
  g.add(sd);

  // ---- legs ----
  // A leg is a strut, not a stick: a moulded shoulder on the belly, a tapered tube splayed out,
  // and a rubber foot squashed onto the ground.
  const strutGeo = new THREE.CylinderGeometry(p.legW * 0.34, p.legW * 0.46, p.legH, 20);
  const footGeo = new THREE.LatheGeometry([
    [0, 0], [p.legW * 0.54, 0], [p.legW * 0.60, 0.0022],
    [p.legW * 0.52, 0.0090], [p.legW * 0.34, 0.0115], [0, 0.0115],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 24);
  const struts = [], feet = [], aerials = [];
  for (const m of MOTOR) {
    const sx = Math.sign(m.x), sz = Math.sign(m.z);
    const x0 = sx * p.w * 0.395, z0 = sz * p.d * 0.275;
    const tiltZ = -sx * 0.115, tiltX = sz * 0.070;      // a shallow splay: a stance, not a spider
    const strut = { at: [x0 + sx * p.legH * 0.057, p.legH / 2, z0 - sz * p.legH * 0.035], rot: [tiltX, 0, tiltZ] };
    struts.push(strut);
    feet.push({ at: [x0 + sx * p.legH * 0.114, 0.0004, z0 - sz * p.legH * 0.070] });
    // the aerials are bonded to the BACK of the rear legs — same place, same lean, overlapping
    // the strut. Give them their own tilt and they fly off the leg they are supposed to be on.
    if (sz < 0) aerials.push({
      at: [strut.at[0], p.legH * 0.50, strut.at[2] - 0.0058],
      rot: strut.rot });
  }
  g.add(S.repeat(strutGeo, carbon, struts));
  g.add(S.repeat(footGeo, rubber, feet));
  const aerialGeo = S.csg(() => S.rb(0.0054, 0.0300, 0.0105, 0.0022, 14),
    () => new THREE.BoxGeometry(0.0054, 0.0300, 0.0105), 34);
  g.add(S.repeat(aerialGeo, black, aerials));

  // ---- fasteners: the same six coordinates the counterbores were cut at ----
  g.add(S.repeat(screwGeo(), alu, SCREW_AT.map((at) => ({ at, rot: [Math.PI, 0, 0] })), { shadow: false }));

  return g;
}
