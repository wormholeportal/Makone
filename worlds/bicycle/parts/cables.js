// cables — the four thin lines that turn a set of components into a bicycle: two brake cables
// from the hoods, two gear cables from a pair of down tube shifters, and the levers themselves.
// Datum: mounted. Every run STARTS on a piece of hardware another part built and ENDS on another
// one, and both ends come out of params — a cable that begins in mid-air is worse than no cable.
// Pivots: none. The levers are where the rider left them.
import * as THREE from 'three';
import { P, COCKPIT, CABLE, DRIVE, PALETTE } from '../params.js';
import { merge, taperedTubeGeo, alongGeo } from '../forms.js';

export const params = CABLE;
export const datum = 'mounted';

const HALF = COCKPIT.barW / 2;
const DRIVE_Z = 0.0500;

export const inventory = [
  'rear brake: housing off the left hood, over the top tube stops, BARE inner between them, then '
    + 'housing again down to the caliper — which is how a rear brake is actually run',
  'front brake: one loop off the right hood, over the bar and down the front of the head tube to '
    + "the caliper's barrel adjuster",
  'two down tube shifters on their bosses, each with a paddle a thumb can reach',
  'gear cables: right shifter down the down tube, through the guide UNDER the bottom bracket, '
    + 'along the chainstay to the rear mech; left shifter up to the front mech',
  `housing ø${CABLE.housingR * 2000}mm, bare inner ø${CABLE.wireR * 2000}mm, ferrules where one `
    + 'becomes the other',
];

/** A cable run: points in order, a constant radius, as geometry. */
const run = (pts, r, seg = 30) => taperedTubeGeo(pts, [r, r], { seg, radial: 7 });

export default function build() {
  const g = new THREE.Group();
  g.name = 'cables';

  const housingMat = new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.42, metalness: 0.35 });
  const wireMat = new THREE.MeshStandardMaterial({ color: PALETTE.spoke, roughness: 0.24, metalness: 0.95 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: PALETTE.lug, roughness: 0.16, metalness: 0.95 });

  const housings = [], wires = [], metal = [];
  const R = CABLE.housingR;
  const [ttx, tty] = P.topDir;
  const ttUp = [-tty, ttx];                             // out of the top tube, upward

  // ---- rear brake: left hood → the top tube stops → the caliper ----
  const stopF = [P.topStopFront[0] + ttUp[0] * 0.0165, P.topStopFront[1] + ttUp[1] * 0.0165, 0];
  const stopR = [P.topStopRear[0] + ttUp[0] * 0.0165, P.topStopRear[1] + ttUp[1] * 0.0165, 0];
  housings.push(run([
    [P.cableOut[0], P.cableOut[1], -HALF],
    [P.cableOut[0] - 0.030, P.cableOut[1] + 0.038, -HALF + 0.012],
    [P.cableOut[0] - 0.105, P.cableOut[1] + 0.062, -HALF * 0.62],
    [stopF[0] + 0.052, stopF[1] + 0.030, -0.055],
    [stopF[0] + 0.016, stopF[1] + 0.006, -0.010],
    stopF,
  ], R, 40));
  // between the two stops the inner runs BARE along the top tube — half the reason a road bike
  // looks the way it does is that this one stretch has no housing on it
  wires.push(run([stopF, [ (stopF[0] + stopR[0]) / 2, (stopF[1] + stopR[1]) / 2 + 0.0015, 0], stopR],
    CABLE.wireR, 8));
  housings.push(run([
    stopR,
    [stopR[0] - 0.055, stopR[1] - 0.030, -0.006],
    [P.brakeRearTop[0] + 0.014, P.brakeRearTop[1] + 0.075, -0.012],
    [P.brakeRearTop[0], P.brakeRearTop[1] + 0.014, -0.002],
    [P.brakeRearTop[0], P.brakeRearTop[1], 0],
  ], R, 34));

  // ---- front brake: right hood → over the bar → down the front of the head tube ----
  housings.push(run([
    [P.cableOut[0], P.cableOut[1], HALF],
    [P.cableOut[0] - 0.026, P.cableOut[1] + 0.042, HALF - 0.010],
    [P.cableOut[0] - 0.078, P.cableOut[1] + 0.060, HALF * 0.52],
    [P.brakeFrontTop[0] + 0.052, P.brakeFrontTop[1] + 0.088, 0.075],
    [P.brakeFrontTop[0] + 0.030, P.brakeFrontTop[1] + 0.048, 0.016],
    [P.brakeFrontTop[0] + 0.002, P.brakeFrontTop[1] + 0.012, 0],
    [P.brakeFrontTop[0], P.brakeFrontTop[1], 0],
  ], R, 44));

  // ---- down tube shifters ----
  const [dnx, dny] = P.downNormal;
  const [ddx, ddy] = P.downDir;
  for (const sz of [-1, 1]) {
    const boss = [P.shifterAt[0] + dnx * -0.014, P.shifterAt[1] + dny * -0.014, sz * 0.0130];
    metal.push(
      alongGeo(new THREE.CylinderGeometry(0.0105, 0.0105, 0.0180, 16), boss, [-dnx, -dny, 0]),
      alongGeo(new THREE.CylinderGeometry(0.0058, 0.0058, 0.0300, 12), boss, [0, 0, sz]),
    );
    // the paddle: a flat lever swept down and back, where a thumb finds it without looking
    const tip = [boss[0] - ddx * 0.030 + dnx * 0.024, boss[1] - ddy * 0.030 + dny * 0.024,
      sz * 0.0290];
    metal.push(taperedTubeGeo([
      [boss[0], boss[1], sz * 0.0230],
      [(boss[0] + tip[0]) / 2 - 0.004, (boss[1] + tip[1]) / 2 - 0.002, sz * 0.0265],
      tip,
    ], [0.0075, 0.0062, 0.0042], { seg: 12, radial: 7 }));
  }

  // ---- gear cables ----
  const shiftOut = (sz) => [P.shifterAt[0] - dnx * 0.006, P.shifterAt[1] - dny * 0.006, sz * 0.0170];
  // rear: down the down tube, through the guide under the bottom bracket, along the chainstay
  wires.push(run([
    shiftOut(1),
    [P.shifterAt[0] - ddx * 0.10 - dnx * 0.017, P.shifterAt[1] - ddy * 0.10 - dny * 0.017, 0.0175],
    [P.bbGuide[0] + 0.014, P.bbGuide[1] + 0.004, 0.0135],
    [P.bbGuide[0] - 0.014, P.bbGuide[1] - 0.001, 0.0140],
    [P.bb[0] * 0.55, P.bb[1] * 0.62 + P.rearAxle[1] * 0.38 - 0.010, 0.0540],
    [P.rearAxle[0] + 0.030, P.rearAxle[1] - 0.0300, 0.0560],
    [P.rearAxle[0] + 0.034, P.rearAxle[1] - 0.0640, DRIVE_Z + 0.0215],
  ], CABLE.wireR, 46));
  // front: up the seat tube side to the front mech's body
  wires.push(run([
    shiftOut(-1),
    [P.shifterAt[0] - ddx * 0.085 - dnx * 0.010, P.shifterAt[1] - ddy * 0.085 - dny * 0.010, -0.012],
    [P.fdAt[0] - 0.020, P.fdAt[1] - 0.030, 0.016],
    [P.fdAt[0] + 0.014, P.fdAt[1] - 0.008, 0.030],
  ], CABLE.wireR, 24));

  // ---- ferrules: the chrome collar wherever a housing ends ----
  for (const [at, dir] of [
    [stopF, [ttUp[0], ttUp[1], 0]], [stopR, [ttUp[0], ttUp[1], 0]],
    [[P.brakeRearTop[0], P.brakeRearTop[1], 0], [P.stayDir[0], P.stayDir[1], 0]],
    [[P.brakeFrontTop[0], P.brakeFrontTop[1], 0],
      [P.crown[0] - P.frontAxle[0], P.crown[1] - P.frontAxle[1], 0]],
  ]) {
    metal.push(alongGeo(
      new THREE.CylinderGeometry(CABLE.ferruleR, CABLE.ferruleR, CABLE.ferruleL, 10)
        .translate(0, CABLE.ferruleL / 2, 0), at, dir));
  }

  for (const [geos, mat] of [[housings, housingMat], [wires, wireMat], [metal, chromeMat]]) {
    const m = new THREE.Mesh(merge(geos), mat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
