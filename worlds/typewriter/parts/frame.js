// frame — the lacquered shell everything else hangs off: hood at the back, low apron at the
// front, and the well the type bars come up through.
// Datum: y=0 is the desk the feet stand on, +Z is the keyboard side (the front).
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { BODY, PALETTE } from '../params.js';

export const params = BODY;

export const inventory = [
  `hood is ${params.rearD * 1000}mm deep at full height; the apron in front drops to `
    + `${params.apronH * 1000}mm, so the keys stand in open air`,
  `type-bar well ${params.wellW * 1000}×${params.wellD * 1000}mm, cut ${params.wellDepth * 1000}mm `
    + `down and open through the hood's front face`,
  `side rails sweep from ${params.sideRailH * 1000}mm at the front up to the hood's `
    + `${params.h * 1000}mm at the back — a rounded wedge, so the side profile is one casting`,
  `two nickel cheeks ${params.cheekH * 1000}mm above the shell carry the carriage rail`,
  `carriage rail: nickel rod, ${params.railSpan * 1000}mm span`,
  `four rubber feet, ${params.footInset * 1000}mm in from the corners, one shared geometry`,
  'gold maker\'s line and a nickel badge on the apron front',
];

/** Rounded box as a solid, positioned in the part's own coordinates, so the union and the
 *  well cut can all happen in one CSG pass instead of being faked with overlapping meshes. */
function rbSolid(w, h, d, r, [x, y, z]) {
  const s = MK.sphere(r, 12);
  const corners = [];
  for (const cx of [-(w / 2 - r), w / 2 - r])
    for (const cy of [-(h / 2 - r), h / 2 - r])
      for (const cz of [-(d / 2 - r), d / 2 - r])
        corners.push(s.translate([x + cx, y + cy, z + cz]));
  return MK.hull(...corners);
}

/** Rounded wedge: same trick, but the back corners stand taller than the front ones, so the side
 *  rails sweep UP into the hood. Two boxes of different heights butted together read as two
 *  objects from the side — the wedge is what makes the side profile one casting. */
function wedgeSolid(w, hFront, hBack, d, r, [x, y0, zFront]) {
  const s = MK.sphere(r, 12);
  const corners = [];
  for (const cx of [x - (w / 2 - r), x + (w / 2 - r)])
    for (const [cz, h] of [[zFront - r, hFront], [zFront - d + r, hBack]])
      for (const cy of [y0 + r, y0 + h - r])
        corners.push(s.translate([cx, cy, cz]));
  return MK.hull(...corners);
}

/** hood ∪ apron ∪ side wedges − well. Without manifold this degrades to plain rounded boxes and
 *  no well: still a typewriter-shaped shell, just with a closed basket. */
function shellGeos(p) {
  const rearZ = -p.d / 2 + p.rearD / 2;
  const apronD = p.d - p.rearD;
  const apronZ = p.d / 2 - apronD / 2;
  const rearY = p.footH + p.h / 2;
  const apronY = p.footH + p.apronH / 2;

  // side rails run the apron's whole depth, rising from sideRailH at the front to the hood's own
  // height at the back, so hood and apron read as one casting with a keyboard tray between them
  const railX = p.w / 2 - p.sideRailW / 2;

  if (!MK.on()) {
    const railH = (p.sideRailH + p.h) / 2;
    return [
      { geo: MK.rbGeo(p.w, p.h, p.rearD, p.round), at: [0, rearY, rearZ] },
      { geo: MK.rbGeo(p.w, p.apronH, apronD, p.round), at: [0, apronY, apronZ] },
      { geo: MK.rbGeo(p.sideRailW, railH, apronD, p.round), at: [-railX, p.footH + railH / 2, apronZ] },
      { geo: MK.rbGeo(p.sideRailW, railH, apronD, p.round), at: [railX, p.footH + railH / 2, apronZ] },
    ];
  }
  const shell = MK.subtract(
    MK.union(
      rbSolid(p.w, p.h, p.rearD, p.round, [0, rearY, rearZ]),
      rbSolid(p.w, p.apronH, apronD, p.round, [0, apronY, apronZ]),
      wedgeSolid(p.sideRailW, p.sideRailH, p.h, apronD, p.round, [-railX, p.footH, p.d / 2]),
      wedgeSolid(p.sideRailW, p.sideRailH, p.h, apronD, p.round, [railX, p.footH, p.d / 2]),
    ),
    // twice the depth, centred on the top face: the cut leaves exactly wellDepth of opening
    MK.cube(p.wellW, p.wellDepth * 2, p.wellD)
      .translate([0, p.footH + p.h, p.wellZ]),
  );
  return [{ geo: MK.toGeometry(shell), at: [0, 0, 0] }];
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'frame';

  // Crinkle enamel, not piano lacquer: below ~0.45 roughness the whole studio shows up in the
  // hood and a black machine renders as a grey mirror.
  const lacquer = new THREE.MeshStandardMaterial({ color: PALETTE.lacquer, roughness: 0.56, metalness: 0.12 });
  const nickel = new THREE.MeshStandardMaterial({ color: PALETTE.nickel, roughness: 0.24, metalness: 0.92 });
  const rubber = new THREE.MeshStandardMaterial({ color: PALETTE.rubber, roughness: 0.94 });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.35, metalness: 0.85 });

  for (const { geo, at } of shellGeos(p)) {
    const m = new THREE.Mesh(geo, lacquer);
    m.position.set(...at);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }

  // --- cheeks: the two plates the rail spans between ---
  // nickel, not lacquer: as black blocks they read as lumps stuck on the hood (side view)
  const cheekGeo = MK.rbGeo(p.cheekW, p.cheekH, p.cheekD, 0.004);   // shared (E4)
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, nickel);
    cheek.position.set(sx * (p.w / 2 - p.cheekW / 2), p.footH + p.h + p.cheekH / 2 - 0.004, -0.052);
    cheek.castShadow = cheek.receiveShadow = true;
    g.add(cheek);
  }

  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(p.railR, p.railR, p.railSpan, 16).rotateZ(Math.PI / 2), nickel);
  rail.position.set(0, p.footH + p.h + p.railRise, p.railZ);
  rail.castShadow = true;
  g.add(rail);

  // --- feet, one geometry between the four (E4) ---
  const footGeo = new THREE.CylinderGeometry(p.footR, p.footR * 0.88, p.footH, 16);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = new THREE.Mesh(footGeo, rubber);
    foot.position.set(sx * (p.w / 2 - p.footInset), p.footH / 2, sz * (p.d / 2 - p.footInset));
    foot.castShadow = true;
    g.add(foot);
  }

  // --- apron front: gold line above, nickel badge below it ---
  const frontZ = p.d / 2 + 0.0012;
  const line = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.052, 0.0016, 0.0012), gold);
  line.position.set(0, p.footH + p.apronH - 0.008, frontZ);
  g.add(line);

  const badge = new THREE.Mesh(MK.rbGeo(p.badgeW, 0.0095, 0.0022, 0.001), nickel);
  badge.position.set(0, p.footH + p.apronH * 0.42, frontZ);
  badge.castShadow = true;
  g.add(badge);

  return g;
}
