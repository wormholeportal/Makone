// gimbal — the three-axis head under the nose: damper plate, yaw motor, roll arm, pitch yoke,
// and the camera hanging off the end of all three.
// Datum: mounted. It hangs GIMBAL.hangY under the shell, on the axis params checked for prop
// clearance.
// Pivots: `yaw`, `roll`, `pitch` — the camera is a child of the last of them, so a scene aims it
// with three numbers and nothing else in the aircraft has to move.
//
// A gimbal is the one part of an aircraft you look at up close, so it gets the machined detail:
// anodised motor housings with their bolt circles, lightening pockets milled out of the roll arm,
// a knurled focus ring, heat-sink ribs down the camera's flanks, and the flat ribbon cable that
// has to loop slackly enough for all three axes to move.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { GIMBAL, BODY, PALETTE } from '../params.js';
import * as S from '../shapes.js';

export const params = GIMBAL;
export const datum = 'mounted';

export const inventory = [
  'three axes in the right order: yaw off the airframe, then roll, then pitch — the camera is a '
    + 'child of all three, which is what makes it steady',
  `it hangs ${params.hangY * 1000}mm under the shell, far enough below the prop discs that the `
    + 'blades stay out of frame (checked in params)',
  `camera ${params.camW * 1000}×${params.camH * 1000}mm with ${params.fins} heat-sink ribs a side, `
    + `a ø${params.lensR * 2000}mm lens and a ${params.knurls}-tooth knurled focus ring`,
  'the vibration dampers are four rubber balls between the airframe and the yaw motor, and the '
    + 'flat ribbon cable loops slack enough for all three axes',
  'the roll arm is milled, not moulded: two lightening pockets and a bolt circle on each motor cap',
  'a real lens: a coated element recessed inside the hood, not a black circle drawn on a box',
];

/** A motor can of radius r and height h, along the given axis, with its cap ring. */
function canGeo(r, h, axis = 'y') {
  const f = axis === 'y' ? S.cylY : axis === 'x' ? S.cylX : S.cylZ;
  return S.csg(
    () => MK.hull(f(h, r, r, 36), f(h * 1.14, r * 0.90, r * 0.90, 36))
      .subtract(f(h * 0.10, r * 1.02, r * 1.02, 36).translate(
        axis === 'y' ? [0, h * 0.20, 0] : axis === 'x' ? [h * 0.20, 0, 0] : [0, 0, h * 0.20])),
    () => new THREE.CylinderGeometry(r, r, h, 32),
    34);
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'gimbal';
  const mountY = BODY.y + 0.0020;
  const mountZ = BODY.d * 0.30;
  g.position.set(0, mountY, mountZ);

  const shell = new THREE.MeshPhysicalMaterial({
    color: PALETTE.shell, roughness: 0.46, metalness: 0.18, clearcoat: 0.35, clearcoatRoughness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.carbonLit, roughness: 0.42, metalness: 0.42 });
  const black = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.55, metalness: 0.22 });
  const rubber = new THREE.MeshStandardMaterial({ color: PALETTE.rubber, roughness: 0.92, metalness: 0.02 });
  const alu = new THREE.MeshStandardMaterial({ color: PALETTE.alu, roughness: 0.24, metalness: 0.94 });
  const aluDark = new THREE.MeshStandardMaterial({ color: PALETTE.aluDark, roughness: 0.32, metalness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.20, metalness: 0.97 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: PALETTE.glass, roughness: 0.04, metalness: 0.9, envMapIntensity: 2.6,
    clearcoat: 1, clearcoatRoughness: 0.02 });
  const coat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.coat, roughness: 0.03, metalness: 1.0, envMapIntensity: 3.0 });

  // ---- the damper plate: a moulded frame, four rubber balls, four studs ----
  const plate = new THREE.Mesh(
    S.csg(
      () => S.rb(0.0440, 0.0042, 0.0350, 0.0022, 16)
        .subtract(S.rb(0.0250, 0.0100, 0.0180, 0.0028, 14))
        .subtract(S.cylY(0.0200, 0.0030, 0.0030, 16, [0, 0, 0.0120])),
      () => MK.rbGeo(0.0440, 0.0042, 0.0350, 0.0022), 34),
    dark);
  plate.castShadow = true;
  g.add(plate);
  const ballPlaces = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ballPlaces.push({ at: [sx * 0.0165, -0.0034, sz * 0.0125] });
  g.add(S.repeat(new THREE.SphereGeometry(0.0042, 16, 12), rubber, ballPlaces));
  g.add(S.repeat(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0060, 12), steel,
    ballPlaces.map((b) => ({ at: [b.at[0], -0.0010, b.at[2]] })), { shadow: false }));
  // the bracket the whole head hangs from
  const hanger = new THREE.Mesh(
    S.csg(() => S.rb(0.0300, 0.0060, 0.0240, 0.0022, 16, [0, -0.0080, 0]),
      () => MK.rbGeo(0.0300, 0.0060, 0.0240, 0.0022), 34), shell);
  hanger.castShadow = true;
  g.add(hanger);

  // ---- yaw ----
  const yaw = new THREE.Group();
  yaw.name = 'yaw';
  yaw.position.y = -0.0110;
  const yawCan = new THREE.Mesh(canGeo(p.yawR, 0.0125, 'y'), alu);
  yawCan.position.y = -0.0062;
  yawCan.castShadow = true;
  yaw.add(yawCan);
  // its bolt circle
  yaw.add(S.repeat(new THREE.CylinderGeometry(0.0009, 0.0009, 0.0012, 10), steel,
    S.ringPlaces(6, p.yawR * 0.66, new THREE.Quaternion(), new THREE.Vector3(0, -0.0002, 0)),
    { shadow: false }));
  g.add(yaw);

  // ---- roll: a milled arm reaching out and down, with the roll motor on its end ----
  const roll = new THREE.Group();
  roll.name = 'roll';
  roll.position.y = -0.0124;
  const armGeo = S.csg(
    () => MK.hull(
      S.rb(0.0110, 0.0100, 0.0130, 0.0022, 16, [0, 0, 0]),
      S.rb(0.0100, 0.0170, 0.0130, 0.0022, 16, [-p.rollArm * 0.80, -0.0042, 0]))
      // the lightening pockets a milled arm has, one each side
      .subtract(S.rb(0.0180, 0.0062, 0.0060, 0.0018, 12, [-p.rollArm * 0.42, -0.0010, 0.0060]))
      .subtract(S.rb(0.0180, 0.0062, 0.0060, 0.0018, 12, [-p.rollArm * 0.42, -0.0010, -0.0060])),
    () => MK.rbGeo(p.rollArm, 0.0090, 0.0090, 0.0026), 36);
  const rollArm = new THREE.Mesh(armGeo, shell);
  rollArm.castShadow = true;
  roll.add(rollArm);
  const rollCan = new THREE.Mesh(canGeo(0.0102, 0.0130, 'x'), alu);
  rollCan.position.set(-p.rollArm * 0.80 - 0.0055, -0.0042, 0);
  rollCan.castShadow = true;
  roll.add(rollCan);
  roll.add(S.repeat(new THREE.CylinderGeometry(0.0008, 0.0008, 0.0012, 10).rotateZ(Math.PI / 2), steel,
    S.ringPlaces(5, 0.0060, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
      new THREE.Vector3(-p.rollArm * 0.80 - 0.0116, -0.0042, 0)), { shadow: false }));
  yaw.add(roll);

  // ---- pitch: the yoke the camera hangs in ----
  const pitch = new THREE.Group();
  pitch.name = 'pitch';
  pitch.position.set(-p.rollArm * 0.80, -0.0180, 0);
  const yoke = new THREE.Mesh(
    S.csg(() => MK.hull(
      S.rb(0.0072, 0.0080, 0.0110, 0.0024, 16, [0, 0.0110, 0]),
      S.rb(0.0072, 0.0130, 0.0090, 0.0024, 16, [0, -0.0010, -p.camD * 0.16]))
      .subtract(S.cylZ(0.0300, 0.0026, 0.0026, 16, [0, -0.0010, 0])),
      () => MK.rbGeo(0.0072, 0.0230, 0.0090, 0.0024), 36),
    shell);
  yoke.castShadow = true;
  pitch.add(yoke);
  const pitchCan = new THREE.Mesh(canGeo(0.0092, 0.0105, 'z'), alu);
  pitchCan.position.set(0, -0.0010, -p.camD * 0.36);
  pitch.add(pitchCan);

  // ---- the camera ----
  const cam = new THREE.Group();
  cam.name = 'camera';
  cam.position.set(p.rollArm * 0.80, 0, 0);            // back on the aircraft's centre line
  const bodyGeo = S.csg(
    () => S.rb(p.camW, p.camH, p.camD, 0.0040, 18)
      // the shoulder the lens barrel grows out of, and the recess round the back plate
      .add(S.cylZ(0.0080, p.hoodR * 0.96, p.hoodR * 0.96, 32, [0, 0, p.camD * 0.42]))
      .subtract(S.rb(p.camW * 0.72, p.camH * 0.66, 0.0030, 0.0012, 12, [0, 0, -p.camD / 2 + 0.0006])),
    () => MK.rbGeo(p.camW, p.camH, p.camD, 0.0040), 36);
  const box = new THREE.Mesh(bodyGeo, black);
  box.castShadow = box.receiveShadow = true;
  cam.add(box);
  // heat-sink ribs down both flanks
  const ribGeo = new THREE.BoxGeometry(0.0016, p.camH * 0.62, 0.0022);
  const ribs = [];
  for (const sx of [-1, 1])
    for (let i = 0; i < p.fins; i++)
      ribs.push({ at: [sx * (p.camW / 2 - 0.0002), 0, -p.camD * 0.30 + i * 0.0042] });
  cam.add(S.repeat(ribGeo, dark, ribs, { shadow: false }));

  // the barrel: hood, knurled focus ring, and the coated element inside
  const hood = new THREE.Mesh(
    S.csg(() => S.cylZ(0.0125, p.hoodR, p.hoodR * 0.94, 40, [0, 0, 0])
      .subtract(S.cylZ(0.0135, p.hoodR - 0.0014, p.hoodR - 0.0016, 40, [0, 0, 0.0012])),
      () => new THREE.CylinderGeometry(p.hoodR, p.hoodR * 0.92, 0.0125, 32).rotateX(Math.PI / 2), 34),
    aluDark);
  hood.position.z = p.camD / 2 + 0.0068;
  hood.castShadow = true;
  cam.add(hood);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(p.lensR * 1.18, p.lensR * 1.30, p.lensLen, 36).rotateX(Math.PI / 2), black);
  barrel.position.z = p.camD / 2 + 0.0030;
  cam.add(barrel);
  const ringQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  cam.add(S.repeat(S.knurlTooth(p.lensR * 1.32, 0.0044, p.knurls), aluDark,
    S.ringPlaces(p.knurls, p.lensR * 1.32, ringQ, new THREE.Vector3(0, 0, p.camD / 2 + 0.0016)),
    { shadow: false }));

  // the element: a shallow cap recessed inside the hood, so it catches one highlight
  const R = (p.lensR * p.lensR + 0.0026 ** 2) / (2 * 0.0026);
  const element = new THREE.Mesh(
    new THREE.SphereGeometry(R, 40, 14, 0, Math.PI * 2, 0, Math.asin(p.lensR / R)).rotateX(Math.PI / 2),
    glass);
  element.position.z = p.camD / 2 + 0.0076 - R;
  cam.add(element);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(p.lensR * 1.02, 0.0009, 10, 40), coat);
  ring.position.z = p.camD / 2 + 0.0074;
  cam.add(ring);

  pitch.add(cam);
  roll.add(pitch);

  // ---- the ribbon cable ----
  // A three-axis head cannot be wired with round cable: it needs a flat FPC with enough slack
  // that yaw, roll and pitch can all move without tugging on it. BOTH ENDS HAVE TO GO
  // SOMEWHERE — it leaves under the damper plate and disappears into the roll motor housing.
  // A ribbon that starts and stops in mid-air is a loose noodle, not a cable.
  const ribbon = new THREE.Mesh(
    new THREE.ExtrudeGeometry(
      (() => {
        const s = new THREE.Shape();
        s.moveTo(-0.0026, -0.00018); s.lineTo(0.0026, -0.00018);
        s.lineTo(0.0026, 0.00018); s.lineTo(-0.0026, 0.00018);
        return s;
      })(),
      { steps: 30, bevelEnabled: false, extrudePath: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0020, 0.0028, 0.0100),       // up under the damper plate
        new THREE.Vector3(-0.0035, -0.0035, 0.0148),     // out round the yaw can, with slack in it
        new THREE.Vector3(-0.0135, -0.0110, 0.0132),
        new THREE.Vector3(-0.0215, -0.0175, 0.0072),
        new THREE.Vector3(-0.0258, -0.0205, 0.0018),     // and into the roll motor housing
      ]) }),
    new THREE.MeshStandardMaterial({ color: 0x7d5f2f, roughness: 0.64, metalness: 0.12 }));
  yaw.add(ribbon);

  return g;
}
