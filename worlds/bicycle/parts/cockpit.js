// cockpit — everything the rider holds or sits on: a seat post and a hammock of a leather saddle
// on its rails, a stem with a bolted faceplate, and a drop bar wrapped in tape from the tops down
// into the drops, with a brake lever on each bend.
// Datum: mounted. Built in the bike's own coordinates off P.seatTop and P.headTop.
import * as THREE from 'three';
import { COCKPIT, GEO, P, PALETTE } from '../params.js';
import { merge, tubeGeo, taperedTubeGeo, tapeTexture } from '../forms.js';

export const params = COCKPIT;
export const datum = 'mounted';

const rad = (d) => (d * Math.PI) / 180;

export const inventory = [
  `seat post ${Math.round(GEO.postOut * 1000)}mm out of the frame, putting the saddle at `
    + `${Math.round((P.saddleAt[1] + 0.03) * 1000)}mm — a rider's height, not a guess`,
  `saddle ${params.saddleL * 1000}mm long and ${params.saddleW * 1000}mm across the tail: a shell `
    + 'that DIPS 18mm across the middle and lifts at the tail, hand-riveted round the skirt',
  `stem ${params.stemLen * 1000}mm, ${params.stemDrop}° down, with a four-bolt faceplate and a `
    + 'two-bolt steerer clamp',
  `drop bar ${params.barW * 1000}mm wide, ${params.barReach * 1000}mm of reach and `
    + `${params.barDrop * 1000}mm of drop — ONE curve per side, mirrored`,
  'tape wound from the tops round the drops with the turns readable, ending in a plug at the bar '
    + 'end and stopping short of the centre where a real bar is bare',
  'brake levers: a hood with a hump and a nose, and a blade hanging down the front of the bend',
];

/** The saddle is not a plank. Its shell is the extruded plan outline DISPLACED afterwards: a dip
 *  across the middle where the rider sits, a lift at the tail, a droop at the nose. One function
 *  does it, and everything else that has to sit on the leather (the rivets) calls the same one. */
const dip = (x, y, L, W) => {
  const t = x / L;                                    // +0.5 nose, −0.5 tail
  const v = Math.abs(y) / (W * 0.5);
  return -0.0175 * v * v                              // the hammock, across the width
    + 0.0260 * Math.max(0, -t - 0.16) ** 1.5 * 3.4    // the tail kicks up
    - 0.0090 * Math.max(0, t - 0.18) ** 1.6 * 3.0;    // the nose drops away
};

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'cockpit';

  const alloy = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.22, metalness: 0.93 });
  const alloyDark = new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, roughness: 0.34, metalness: 0.88 });
  const leather = new THREE.MeshStandardMaterial({ color: PALETTE.saddle, roughness: 0.76, metalness: 0.05 });
  const tape = new THREE.MeshStandardMaterial({ map: tapeTexture(), roughness: 0.84, metalness: 0.05 });
  const brass = new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.30, metalness: 0.92 });
  const black = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.48, metalness: 0.28 });

  const bright = [], dim = [], taped = [], hoods = [], rivets = [];

  // ---- seat post ----
  const postTop = [P.seatTop[0] + P.seatDir[0] * GEO.postOut,
    P.seatTop[1] + P.seatDir[1] * GEO.postOut, 0];
  bright.push(tubeGeo([P.seatTop[0], P.seatTop[1], 0], postTop, 0.0136, 0.0136, 18));

  // ---- the saddle ----
  const saddle = new THREE.Group();
  saddle.name = 'saddle';
  saddle.position.set(postTop[0] - 0.010, postTop[1] + 0.030, 0);
  const L = p.saddleL, W = p.saddleW;
  const shape = new THREE.Shape();
  shape.moveTo(L * 0.50, 0);
  shape.bezierCurveTo(L * 0.42, W * 0.09, L * 0.16, W * 0.20, -L * 0.20, W * 0.36);
  shape.bezierCurveTo(-L * 0.40, W * 0.46, -L * 0.52, W * 0.30, -L * 0.50, 0);
  shape.bezierCurveTo(-L * 0.52, -W * 0.30, -L * 0.40, -W * 0.46, -L * 0.20, -W * 0.36);
  shape.bezierCurveTo(L * 0.16, -W * 0.20, L * 0.42, -W * 0.09, L * 0.50, 0);
  const shellGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.0060, bevelEnabled: true, bevelThickness: 0.0062, bevelSize: 0.0042,
    bevelSegments: 3, curveSegments: 26,
  });
  // the bend: every vertex, top and bottom, moves by the same amount, so the shell keeps its
  // thickness and only its shape changes
  const pos = shellGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + dip(pos.getX(i), pos.getY(i), L, W));
  }
  shellGeo.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeo, leather);
  shell.rotation.x = -Math.PI / 2;                    // the shape's +Z (thickness) becomes up
  shell.position.y = 0.0090;
  shell.castShadow = true;
  saddle.add(shell);

  // hand rivets round the skirt, on the saddle's OWN outline, lifted by the same dip()
  const outline = shape.getPoints(64);
  for (let i = 0; i < outline.length; i += 4) {
    const { x, y } = outline[i];
    if (x > L * 0.30) continue;                       // the nose is too narrow to rivet
    const k = 0.90;                                   // just inside the edge
    // the top of the shell is depth + bevelThickness above z=0, plus however far dip() moved it
    rivets.push(new THREE.SphereGeometry(0.0032, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.60)
      .translate(x * k, y * k, dip(x * k, y * k, L, W) + 0.0108));
  }
  const rivetMesh = new THREE.Mesh(merge(rivets), brass);
  rivetMesh.rotation.x = -Math.PI / 2;
  rivetMesh.position.y = 0.0090;
  saddle.add(rivetMesh);

  // rails, and the two-bolt clamp that grips them
  const railParts = [];
  for (const sz of [-1, 1]) {
    railParts.push(taperedTubeGeo([
      [L * 0.34, -0.0030, sz * 0.0150], [L * 0.16, -0.0150, sz * 0.0215],
      [-L * 0.10, -0.0180, sz * 0.0225], [-L * 0.32, -0.0055, sz * 0.0300],
    ], [0.0030, 0.0032, 0.0032, 0.0030], { seg: 18, radial: 8 }));
  }
  railParts.push(
    new THREE.BoxGeometry(0.0280, 0.0130, 0.0560).translate(0.0060, -0.0165, 0),
    new THREE.CylinderGeometry(0.0165, 0.0140, 0.0130, 16).translate(0.0060, -0.0250, 0),
  );
  const rails = new THREE.Mesh(merge(railParts), alloyDark);
  rails.castShadow = true;
  saddle.add(rails);
  g.add(saddle);

  // ---- stem ----
  // steerTop / barCentre / hoodAt are solved in params: the cables part has to land on the same
  // lever this one draws, and neither of them gets to decide where it is
  const steerTop = [...P.steerTop, 0];
  const dir = [Math.cos(-rad(p.stemDrop)), Math.sin(-rad(p.stemDrop))];
  const barCentre = [...P.barCentre, 0];
  bright.push(taperedTubeGeo([steerTop, [barCentre[0], barCentre[1], 0]],
    [p.stemR, p.stemR * 0.86], { seg: 6, radial: 14 }));
  // bar clamp with a four-bolt faceplate, and the steerer clamp with two
  const faceAngle = Math.atan2(dir[1], dir[0]);
  bright.push(new THREE.CylinderGeometry(0.0215, 0.0215, 0.0340, 20).rotateX(Math.PI / 2)
    .translate(barCentre[0], barCentre[1], 0));
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      dim.push(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0090, 8)
        .rotateZ(Math.PI / 2 - faceAngle)
        .translate(barCentre[0] + Math.cos(faceAngle) * 0.0165 - Math.sin(faceAngle) * sy * 0.0125,
          barCentre[1] + Math.sin(faceAngle) * 0.0165 + Math.cos(faceAngle) * sy * 0.0125,
          sz * 0.0110));
    }
  }
  bright.push(new THREE.CylinderGeometry(0.0198, 0.0198, 0.0300, 20)
    .rotateZ(Math.atan2(P.axisUp[1], P.axisUp[0]) - Math.PI / 2)
    .translate(steerTop[0], steerTop[1], 0));
  bright.push(new THREE.CylinderGeometry(0.0180, 0.0180, 0.0060, 20)
    .rotateZ(Math.atan2(P.axisUp[1], P.axisUp[0]) - Math.PI / 2)
    .translate(steerTop[0] + P.axisUp[0] * 0.0180, steerTop[1] + P.axisUp[1] * 0.0180, 0));

  // ---- the bar: one path per side, mirrored in z ----
  const [bx, by] = barCentre;
  const half = p.barW / 2;
  for (const sz of [-1, 1]) {
    const pts = [
      [bx, by, 0],                                          // at the clamp
      [bx, by, sz * half * 0.42],
      [bx - 0.004, by - 0.002, sz * half * 0.80],           // the tops, sweeping very slightly back
      [bx + 0.022, by - 0.008, sz * half * 0.97],           // into the bend
      [P.hoodAt[0], P.hoodAt[1], sz * half],                // the hood
      [bx + p.barReach, by - p.barDrop * 0.55, sz * half],  // the front of the drop
      [bx + p.barReach * 0.62, by - p.barDrop, sz * half],
      [bx + p.barReach * 0.04, by - p.barDrop * 0.96, sz * half],   // the end of the drop
    ];
    const r = p.barR;
    // The tape has to be CONCENTRIC with the bar, and two Catmull-Rom splines through different
    // point sets are not the same curve however close their ends are — the tape dives inside the
    // bar somewhere in the middle and the alloy flashes through it. So sample the bar's curve
    // densely, build the bar from those samples, and build the tape from a slice of the SAME list.
    const spine = new THREE.CatmullRomCurve3(
      pts.map((q) => new THREE.Vector3(...q)), false, 'centripetal').getSpacedPoints(64);
    bright.push(taperedTubeGeo(spine, [r * 1.06, r * 1.02, r, r, r, r, r, r],
      { seg: 52, radial: 12 }));
    taped.push(taperedTubeGeo(spine.slice(11),
      [r + 0.0020, r + 0.0026, r + 0.0026, r + 0.0026, r + 0.0026, r + 0.0022],
      { seg: 54, radial: 14 }));
    // the plug in the end of the bar
    bright.push(new THREE.CylinderGeometry(r + 0.0028, r + 0.0026, 0.0075, 14)
      .rotateZ(Math.PI / 2)
      .translate(bx + p.barReach * 0.04 - 0.0020, by - p.barDrop * 0.96, sz * half));

    // ---- brake lever: a hood with a hump and a nose, and a blade down the front ----
    const hood = new THREE.Group();
    hood.position.set(P.hoodAt[0], P.hoodAt[1], sz * half);
    hood.rotation.z = P.hoodTilt;                       // it leans along the bar's forward run
    const s = new THREE.Shape();
    s.moveTo(-0.0300, -0.0040);
    s.lineTo(-0.0230, 0.0130);
    s.quadraticCurveTo(0.0040, 0.0320, 0.0300, 0.0290);
    s.quadraticCurveTo(0.0480, 0.0250, 0.0455, 0.0000);
    s.lineTo(0.0300, -0.0135);
    s.quadraticCurveTo(0, -0.0195, -0.0300, -0.0040);
    hoods.push(new THREE.ExtrudeGeometry(s, {
      depth: 0.0165, bevelEnabled: true, bevelThickness: 0.0080, bevelSize: 0.0075,
      bevelSegments: 4, curveSegments: 14,
    }).translate(0, 0, -0.00825).applyMatrix4(hood.matrix.compose(
      new THREE.Vector3(...hood.position.toArray()),
      new THREE.Quaternion().setFromEuler(hood.rotation), new THREE.Vector3(1, 1, 1))));

    const bladePts = [
      [0.0430, -0.0080, 0], [0.0470, -0.0330, 0], [0.0400, -0.0620, 0], [0.0300, -0.0790, 0],
    ].map(([x, y, z]) => {
      const c = Math.cos(hood.rotation.z), sn = Math.sin(hood.rotation.z);
      return [hood.position.x + x * c - y * sn, hood.position.y + x * sn + y * c, hood.position.z + z];
    });
    bright.push(taperedTubeGeo(bladePts, [0.0068, 0.0062, 0.0052, 0.0042], { seg: 16, radial: 8 }));
  }

  // ---- one mesh per material ----
  for (const [geos, mat] of [[bright, alloy], [dim, alloyDark], [taped, tape], [hoods, black]]) {
    const m = new THREE.Mesh(merge(geos), mat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }

  return g;
}
