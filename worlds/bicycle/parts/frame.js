// frame — a lugged steel road frame and its fork: eight tubes between points that params already
// solved, the lugwork that makes it a BUILT frame rather than a welded one, and everything brazed
// on afterwards — headset, dropouts with a real slot, cable stops, bottle cage, badge, decals,
// and the two calipers that reach round the tyre to the rim.
// Datum: y=0 is the ground; the frame hangs off the two axles, so it is `mounted`.
// Pivots: `steer` — everything forward of the head tube turns on it.
//
// Draw-call policy: a frame is fifty small chromed things, and fifty small chromed things are
// fifty draw calls unless they are welded together first. Everything static of one material is
// merged into ONE geometry — the whole painted frame is a single call, all the chrome a second,
// the gold lug lining a third.
import * as THREE from 'three';
import { GEO, P, WHEEL, PALETTE } from '../params.js';
import {
  merge, tubeGeo, taperedTubeGeo, lugGeo, linerGeo, alongGeo, frame3,
  decalTexture, badgeTexture,
} from '../forms.js';

export const params = GEO;
export const datum = 'mounted';

const V = (xy, z = 0) => [xy[0], xy[1], z];
const N2 = (a, b) => {                                  // unit vector from a to b, in the frame plane
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(dx, dy);
  return [dx / L, dy / L, 0];
};

export const inventory = [
  `head angle ${params.headAngle}°, seat angle ${params.seatAngle}°, chainstay `
    + `${Math.round(params.chainstay * 1000)}mm, ${Math.round(params.wheelbase * 1000)}mm wheelbase`,
  `bottom bracket solved, not typed: x = √(chainstay² − drop²) = ${Math.round(P.bbX * 1000)}mm `
    + `behind the front axle, ${Math.round(P.bbY * 1000)}mm up`,
  `fork crown solved from the axle back up the steer axis less ${params.rake * 1000}mm of rake — `
    + `it lands at (${Math.round(P.crown[0] * 1000)}, ${Math.round(P.crown[1] * 1000)})mm`,
  'seven lugs, each with filed SHORELINES tapering into the tube and a gold liner round the edge '
    + '— a plain chrome sleeve reads as a hose clamp, not as lugwork',
  'brazed on: headset cups and spacers, two cable stops on the top tube, a guide under the bottom '
    + 'bracket, a wire bottle cage, a head badge and a down tube transfer',
  'dropouts are extruded plates with a REAL axle slot and a derailleur hanger; the chainstays '
    + `flare to ${Math.round(0.057 * 2000)}mm across and taper 21 → 12mm to clear tyre and chainring`,
  'single-pivot calipers whose arms CURVE round the tyre to pads on the braking surface — pad and '
    + 'rim are both measured from the same axle, so nothing is placed by eye',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'frame';

  const paint = new THREE.MeshStandardMaterial({
    color: PALETTE.frame, roughness: 0.22, metalness: 0.42, envMapIntensity: 1.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: PALETTE.lug, roughness: 0.14, metalness: 0.96 });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.30, metalness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.5, metalness: 0.4 });

  // collected here, merged into one mesh per material at the bottom
  const painted = [], chrome = [], liners = [], blacks = [];
  const forkPaint = [], forkChrome = [];

  // ---- main triangle ----
  painted.push(
    tubeGeo(V(P.headBottom), V(P.headTop), p.tubeHead, p.tubeHead, 20),
    tubeGeo(V(P.topAtSeat), V(P.topAtHead), p.tubeTop, p.tubeTop * 0.95, 18),
    tubeGeo(V(P.bb), V(P.downAtHead), p.tubeDown, p.tubeDown * 0.92, 18),
    tubeGeo(V(P.bb), V(P.seatTop), p.tubeSeat, p.tubeSeat, 18),
  );

  // ---- rear triangle: the stays are PAIRS, they run to the DROPOUT rather than the axle, and
  //      the chainstay bends outward round the tyre on its way there ----
  const dropZ = 0.0480;
  for (const sz of [-1, 1]) {
    painted.push(taperedTubeGeo([
      [P.bb[0] - 0.004, P.bb[1], sz * 0.0355],
      [P.bb[0] * 0.55 + P.rearAxle[0] * 0.45, P.bb[1] * 0.62 + P.rearAxle[1] * 0.38, sz * 0.0570],
      [P.rearAxle[0] + 0.012, P.rearAxle[1] - 0.002, sz * dropZ],
    ], [p.chainstayR, p.chainstayR * 0.86, p.chainstayR * 0.58], { seg: 24, radial: 12 }));
    painted.push(taperedTubeGeo([
      [P.seatTop[0] + 0.004, P.seatTop[1] - 0.028, sz * 0.0130],
      [(P.seatTop[0] + P.rearAxle[0]) / 2 + 0.002, (P.seatTop[1] + P.rearAxle[1]) / 2, sz * 0.0300],
      [P.rearAxle[0] + 0.004, P.rearAxle[1] + 0.010, sz * dropZ],
    ], [p.stayTop, p.stayTop * 0.82, p.stayBottom], { seg: 20, radial: 12 }));
    chrome.push(dropoutGeo([P.rearAxle[0], P.rearAxle[1], sz * dropZ], sz > 0));
  }

  // ---- the two bridges. The seat-stay bridge sits just over the tyre, which is the only place
  //      a brake bridge can go, and the caliper's reach falls out of that. ----
  // where the PAD sits: far enough down the braking surface that an 12mm pad clears the tyre's
  // bead. rimR is the rim's outer edge and the casing starts right there — measure from it.
  const brakeR = WHEEL.rimR - 0.0098;
  const stayDir = [...P.stayDir, 0];
  const bridge = P.brakeRear;
  painted.push(
    tubeGeo([bridge[0], bridge[1], -0.021], [bridge[0], bridge[1], 0.021], 0.0052, 0.0052, 10),
    tubeGeo([P.bb[0] - 0.086, P.bb[1] + 0.004, -0.032], [P.bb[0] - 0.086, P.bb[1] + 0.004, 0.032],
      0.0050, 0.0050, 10),
  );

  // ---- bottom bracket shell, with the cable guide brazed under it ----
  chrome.push(
    alongGeo(new THREE.CylinderGeometry(0.0215, 0.0215, 0.0700, 24), V(P.bb), [0, 0, 1]),
    alongGeo(new THREE.CylinderGeometry(0.0250, 0.0250, 0.0075, 24), [P.bb[0], P.bb[1], -0.0320],
      [0, 0, 1]),
    alongGeo(new THREE.CylinderGeometry(0.0250, 0.0250, 0.0075, 24), [P.bb[0], P.bb[1], 0.0245],
      [0, 0, 1]),
  );
  blacks.push(alongGeo(new THREE.BoxGeometry(0.0250, 0.0055, 0.0230), V(P.bbGuide), P.downNormal));

  // ---- lugs, and the gold line round each one ----
  const [ax, ay] = P.axisUp;
  const lug = (at, dir, len, r, opts) => {
    chrome.push(lugGeo(V(at), dir, len, r, opts));
    liners.push(linerGeo([at[0] + dir[0] * len, at[1] + dir[1] * len, 0], dir, r * 1.02));
  };
  const dtDir = N2(P.bb, P.downAtHead);
  const ttDir = N2(P.topAtSeat, P.topAtHead);
  lug(P.headBottom, [ax, ay, 0], 0.022, p.tubeHead * 1.13);                 // lower head lug
  lug(P.headTop, [-ax, -ay, 0], 0.022, p.tubeHead * 1.13);                  // upper head lug
  lug(P.seatTop, [-P.seatDir[0], -P.seatDir[1], 0], 0.044, p.tubeSeat * 1.17);   // seat cluster
  lug(P.bb, [P.seatDir[0], P.seatDir[1], 0], 0.032, p.tubeSeat * 1.15);
  lug(P.bb, dtDir, 0.038, p.tubeDown * 1.12);
  lug(P.downAtHead, [-dtDir[0], -dtDir[1], 0], 0.030, p.tubeDown * 1.12, { points: 2, phase: 1.5 });
  lug(P.topAtHead, [-ttDir[0], -ttDir[1], 0], 0.028, p.tubeTop * 1.14, { points: 2, phase: 1.5 });

  // ---- headset: a cup pressed into each end of the head tube ----
  const cup = (at, dir) => merge([
    alongGeo(new THREE.CylinderGeometry(0.0228, 0.0212, 0.0090, 24).translate(0, 0.0045, 0),
      V(at), dir),
    alongGeo(new THREE.CylinderGeometry(0.0206, 0.0206, 0.0060, 24).translate(0, 0.0115, 0),
      V(at), dir),
  ]);
  chrome.push(cup(P.headTop, [ax, ay, 0]), cup(P.headBottom, [-ax, -ay, 0]));

  // ---- cable stops on the top tube, for the rear brake housing ----
  const stop = (at, dir) => alongGeo(merge([
    new THREE.CylinderGeometry(0.0062, 0.0075, 0.0110, 12).translate(0, 0.0055, 0),
    new THREE.CylinderGeometry(0.0038, 0.0038, 0.0060, 10).translate(0, 0.0135, 0),
  ]), V(at), dir);
  const ttUp = [-P.topDir[1], P.topDir[0], 0];          // out of the top tube, upward
  chrome.push(stop(P.topStopFront, ttUp), stop(P.topStopRear, ttUp));

  // ---- seat clamp: the binder bolt that actually holds the post up ----
  const clampAt = [P.seatTop[0] + P.seatDir[0] * 0.007, P.seatTop[1] + P.seatDir[1] * 0.007, 0];
  chrome.push(
    alongGeo(new THREE.CylinderGeometry(p.tubeSeat * 1.24, p.tubeSeat * 1.24, 0.0140, 20),
      clampAt, [P.seatDir[0], P.seatDir[1], 0]),
    alongGeo(merge([
      new THREE.BoxGeometry(0.0130, 0.0160, 0.0090),
      new THREE.CylinderGeometry(0.0032, 0.0032, 0.0250, 10).rotateX(Math.PI / 2),
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.0050, 6).rotateX(Math.PI / 2).translate(0, 0, 0.0135),
    ]), [clampAt[0] - 0.0175, clampAt[1] - 0.0055, 0], [0, 1, 0]),
  );

  // ---- a wire bottle cage on the down tube ----
  chrome.push(cageGeo());

  // ---- the fork: a chromed crown and two blades that BEND. A straight fork with the axle offset
  //      sideways is the classic tell of a bike modelled from a photograph. ----
  const steer = new THREE.Group();
  steer.name = 'steer';
  forkChrome.push(crownGeo());
  for (const sz of [-1, 1]) {
    const t0 = [P.crown[0], P.crown[1] - 0.017, sz * 0.0400];
    const t2 = [P.frontAxle[0], P.frontAxle[1], sz * 0.0480];
    forkPaint.push(taperedTubeGeo([
      t0,
      [P.crown[0] + (t2[0] - t0[0]) * 0.52 - 0.0105, P.crown[1] + (t2[1] - t0[1]) * 0.52, sz * 0.0450],
      t2,
    ], [0.0112, 0.0094, 0.0062], { seg: 26, radial: 12 }));
    forkChrome.push(dropoutGeo([P.frontAxle[0], P.frontAxle[1], sz * 0.0480], false, true));
  }
  // the steerer standing out of the head tube for the stem to clamp, and its spacers
  blacks.push(tubeGeo(V(P.headTop), [P.headTop[0] + ax * 0.062, P.headTop[1] + ay * 0.062, 0],
    0.0135, 0.0135, 16));
  for (let i = 0; i < 2; i++) {
    forkChrome.push(alongGeo(
      new THREE.CylinderGeometry(0.0182, 0.0182, 0.0055, 22).translate(0, 0.0028, 0),
      [P.headTop[0] + ax * (0.0165 + i * 0.0060), P.headTop[1] + ay * (0.0165 + i * 0.0060), 0],
      [ax, ay, 0]));
  }

  // ---- calipers. Each one is given its axle and the HOLE it bolts through — the bridge at the
  //      back, the fork crown at the front — and works out its own reach from those two. That is
  //      why the front one is a long-reach brake and the rear one is not: the crown is further
  //      from its axle than the bridge is from the other. Nothing is placed by eye. ----
  g.add(caliper(P.rearAxle, [...bridge, 0], brakeR, chromeMat, dark));
  steer.add(caliper(P.frontAxle, [...P.brakeFront, 0], brakeR, chromeMat, dark));

  // ---- transfers: a head badge and a down tube decal. Paint with no lettering on it is a
  //      frameset on a wall, not a bicycle. ----
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(p.tubeHead * 1.02, p.tubeHead * 1.02, 0.0320, 20, 1, true, -0.62, 1.24),
    new THREE.MeshStandardMaterial({ map: badgeTexture('M'), transparent: true, alphaTest: 0.35,
      roughness: 0.32, metalness: 0.75 }));
  badge.geometry.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(P.headBottom[0] + ax * 0.048, P.headBottom[1] + ay * 0.048, 0),
    frame3([ax, ay, 0], [ay, -ax, 0]),                  // +Y up the head tube, +Z out the front
    new THREE.Vector3(1, 1, 1)));
  g.add(badge);

  const decalMat = new THREE.MeshStandardMaterial({
    map: decalTexture('MAKONE', { fg: '#f4f1e8', accent: '#c8a44a' }),
    transparent: true, alphaTest: 0.12, roughness: 0.28, metalness: 0.35 });
  const dtMid = [(P.bb[0] + P.downAtHead[0]) / 2 - dtDir[0] * 0.015,
    (P.bb[1] + P.downAtHead[1]) / 2 - dtDir[1] * 0.015, 0];
  for (const face of [1, -1]) {
    const d = new THREE.Mesh(
      new THREE.CylinderGeometry(p.tubeDown * 1.014, p.tubeDown * 1.014, 0.2200, 22, 1, true,
        -1.05, 2.10),
      decalMat);
    d.geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...dtMid),
      frame3(face > 0 ? dtDir : [-dtDir[0], -dtDir[1], 0], [0, 0, face]),
      new THREE.Vector3(1, 1, 1)));
    g.add(d);
  }

  // ---- one mesh per material ----
  for (const [geos, mat, parent] of [[painted, paint, g], [chrome, chromeMat, g],
    [liners, gold, g], [blacks, dark, g], [forkPaint, paint, steer], [forkChrome, chromeMat, steer]]) {
    const m = new THREE.Mesh(merge(geos), mat);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
  }
  g.add(steer);

  return g;
}

// ---------------------------------------------------------------------------

/** A dropout: a plate with a REAL slot in it, extruded across the frame. `hanger` adds the tab
 *  the rear derailleur bolts to; `down` turns the slot to face the ground, which is what a fork
 *  end does. A plain rectangle here is the difference between a bicycle and a bicycle-shaped toy. */
function dropoutGeo(at, hanger, down = false) {
  const R = 0.0050;                                     // the axle's own radius
  const s = new THREE.Shape();
  s.moveTo(-0.026, -R);
  s.lineTo(-0.026, -0.015);
  s.lineTo(0.019, -0.016);
  s.quadraticCurveTo(0.027, 0, 0.019, 0.016);
  s.lineTo(-0.026, 0.015);
  s.lineTo(-0.026, R);
  s.lineTo(0, R);
  s.absarc(0, 0, R, Math.PI / 2, -Math.PI / 2, true);   // the slot's rounded end, round the axle
  s.lineTo(-0.026, -R);
  const parts = [new THREE.ExtrudeGeometry(s, {
    depth: 0.0052, bevelEnabled: true, bevelThickness: 0.0010, bevelSize: 0.0010, bevelSegments: 2,
    curveSegments: 10,
  }).translate(0, 0, -0.0026)];
  if (hanger) {
    const h = new THREE.Shape();
    h.moveTo(0.008, -0.010);
    h.lineTo(0.030, -0.028);
    h.quadraticCurveTo(0.037, -0.038, 0.026, -0.043);
    h.lineTo(0.004, -0.028);
    h.closePath();
    parts.push(new THREE.ExtrudeGeometry(h, { depth: 0.0050, bevelEnabled: false, curveSegments: 8 })
      .translate(0, 0, -0.0025));
  }
  return merge(parts).rotateZ(down ? -Math.PI / 2 + 0.30 : -0.20).translate(...at);
}

/** The fork crown: a shouldered block, not a box — wide at the blades, waisted underneath, with
 *  the lower headset race sitting on top of it. */
function crownGeo() {
  // the shape's x runs ACROSS the bike (out to the blades at ±40mm) and the extrude's depth runs
  // front to back. Swap those in your head and you get an 86mm-deep chrome loaf.
  const s = new THREE.Shape();
  s.moveTo(-0.045, -0.012);
  s.quadraticCurveTo(-0.050, 0.014, -0.016, 0.017);
  s.lineTo(0.016, 0.017);
  s.quadraticCurveTo(0.050, 0.014, 0.045, -0.012);
  s.quadraticCurveTo(0, -0.030, -0.045, -0.012);
  const g = merge([
    new THREE.ExtrudeGeometry(s, {
      depth: 0.0400, bevelEnabled: true, bevelThickness: 0.0030, bevelSize: 0.0030, bevelSegments: 3,
      curveSegments: 12,
    }).translate(0, 0, -0.0180),
    new THREE.CylinderGeometry(0.0218, 0.0200, 0.0090, 24).translate(0, 0.0165, 0),
  ]);
  return alongGeo(g, [P.crown[0], P.crown[1], 0], [...P.axisUp, 0], [P.axisUp[1], -P.axisUp[0], 0]);
}

/** A single-pivot caliper: bolted through `mount`, reaching back down to the braking surface of
 *  the wheel on `axle`. The reach is not a parameter — it is the distance between those two,
 *  which is the only value that puts the pad on the rim. The arms CURVE round the tyre; two
 *  straight boxes read as a clothes peg. */
function caliper(axle, mount, brakeR, chromeMat, darkMat) {
  const span = Math.hypot(mount[0] - axle[0], mount[1] - axle[1]);
  const dir = [(mount[0] - axle[0]) / span, (mount[1] - axle[1]) / span];
  const REACH = span - brakeR;
  const b = new THREE.Group();
  b.position.set(mount[0], mount[1], 0);
  b.rotation.z = Math.atan2(dir[1], dir[0]) - Math.PI / 2;   // +Y of the group points outward
  const parts = [
    new THREE.CylinderGeometry(0.0080, 0.0080, 0.0300, 16).rotateX(Math.PI / 2),
    new THREE.CylinderGeometry(0.0052, 0.0052, 0.0150, 10).translate(0, 0.0150, 0),  // barrel adjuster
    new THREE.CylinderGeometry(0.0068, 0.0068, 0.0050, 12).translate(0, 0.0240, 0),
  ];
  const pads = [];
  for (const sz of [-1, 1]) {
    parts.push(taperedTubeGeo([
      [0, 0.002, sz * 0.0090],
      [sz * 0.0185, -0.0130, sz * 0.0105],
      [sz * 0.0255, -REACH * 0.72, sz * 0.0115],
      [sz * 0.0075, -REACH - 0.0020, sz * 0.0120],
    ], [0.0062, 0.0050, 0.0042, 0.0036], { seg: 20, radial: 8 }));
    parts.push(new THREE.CylinderGeometry(0.0030, 0.0030, 0.0100, 8).rotateX(Math.PI / 2)
      .translate(sz * 0.0050, -REACH, sz * (WHEEL.rimW / 2 + 0.0078)));
    pads.push(new THREE.BoxGeometry(0.0085, 0.0125, 0.0072)
      .translate(sz * 0.0038, -REACH, sz * (WHEEL.rimW / 2 + 0.0040)));
  }
  const arms = new THREE.Mesh(merge(parts), chromeMat);
  const pad = new THREE.Mesh(merge(pads), darkMat);
  arms.castShadow = pad.castShadow = true;
  b.add(arms, pad);
  return b;
}

/** A wire bottle cage on the down tube: two C-rings that cradle the bottle and the wires that
 *  join them.
 *
 *  Built in the TUBE's own basis — local x out of the tube, y across the bike, z along the tube —
 *  and mapped once at the end. Placing cage wire in world coordinates is how you get a bird's
 *  nest floating next to the tube it is supposed to be bolted to. */
function cageGeo() {
  const B = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(P.downNormal[0], P.downNormal[1], 0),   // local +x: out of the tube
    new THREE.Vector3(0, 0, 1),                               // local +y: across the bike
    new THREE.Vector3(P.downDir[0], P.downDir[1], 0),         // local +z: up the tube
  ).setPosition(P.cageAt[0], P.cageAt[1], 0);

  const R = 0.0335;                                     // a 74mm bottle
  const cx = 0.0500;                                    // its centre, one tube radius out
  const wire = 0.0023;
  const ARC = Math.PI * 1.62;                           // the ring is open where the tube is
  const parts = [];
  for (const [z, arc] of [[-0.0480, ARC], [0.0460, ARC * 0.86]]) {
    parts.push(new THREE.TorusGeometry(R, wire, 6, 30, arc)
      .rotateZ(-arc / 2).translate(cx, 0, z));
  }
  for (const a of [0, 2.0, -2.0]) {                     // the wires down the front and both sides
    parts.push(tubeGeo(
      [cx + Math.cos(a) * R, Math.sin(a) * R, -0.0480],
      [cx + Math.cos(a) * R, Math.sin(a) * R, 0.0460], wire, wire, 6));
  }
  // the backbone: one strip down the tube, the two bolts through it, and a short strut out to
  // each end of each ring — a ring floating with nothing joining it to the frame is a hoop
  parts.push(tubeGeo([0.0140, 0, -0.0510], [0.0140, 0, 0.0490], wire * 1.3, wire * 1.3, 8));
  for (const z of [-0.0400, 0.0250]) {
    parts.push(new THREE.CylinderGeometry(0.0044, 0.0044, 0.0080, 8)
      .rotateZ(Math.PI / 2).translate(0.0125, 0, z));
  }
  for (const z of [-0.0480, 0.0460]) {
    const a = (z < 0 ? ARC : ARC * 0.86) / 2;
    for (const sy of [-1, 1]) {
      parts.push(tubeGeo([0.0140, 0, z],
        [cx + Math.cos(a) * R, sy * Math.sin(a) * R, z], wire, wire, 6));
    }
  }
  return merge(parts).applyMatrix4(B);
}
