// typebars — the basket: a slotted segment, a fan of type bars that all converge on ONE point on
// the platen, the ribbon and its two spools. This is the part that says "typewriter"; the shell
// is furniture.
// Datum: mounted (floor coordinates). Pivot: `striker` is the centre bar; every bar is driven
// through `userData.setBar(i, t)`, t=0 at rest, t=1 with the head on the platen.
//
// The convergence is the whole trick. Every pivot sits on a circle of radius `segmentR` centred
// on the fulcrum F and lying in the plane perpendicular to F→P, where P is the type point. That
// makes |pivot − P| the same number for every bar, so one blade length serves all of them and
// all of them arrive at the same place. Pick the pivots any other way and the tips land on a
// ring instead of a point — which is what a fan of cones looks like, not a typewriter.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { TYPEBARS, TYPE_POINT, BAR_LEN, ASSEMBLY, PALETTE } from '../params.js';

export const params = TYPEBARS;
export const datum = 'mounted';

/** Blade length: the hypotenuse of (fulcrum→type point) and the segment radius. Derived. */
const BLADE = Math.hypot(BAR_LEN, TYPEBARS.segmentR);

export const inventory = [
  `${params.count} bars fanned over ${params.spread * 2}°, all converging on the type point at `
    + `y=${Math.round(TYPE_POINT.y * 1000)}mm z=${Math.round(TYPE_POINT.z * 1000)}mm`,
  `blade length ${Math.round(BLADE * 1000)}mm — hypot(reach ${Math.round(BAR_LEN * 1000)}mm, `
    + `segment radius ${params.segmentR * 1000}mm), the same for every bar`,
  `bars hang ${params.rest}° back from the strike position, tips down under the deck`,
  `type head ${params.headW * 1000}×${params.headH * 1000}mm on each tip, two slugs per head`,
  `slotted segment ring, radius ${params.segmentR * 1000}mm, in the plane the bars swing through`,
  `two ribbon spools ${params.spoolR * 2000}mm across, on the deck at x=±${params.spoolX * 1000}mm, `
    + 'ribbon rising from them through a vibrator fork at the type point',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'basket';

  const steel = new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, roughness: 0.36, metalness: 0.85 });
  const nickel = new THREE.MeshStandardMaterial({ color: PALETTE.nickel, roughness: 0.26, metalness: 0.92 });
  const head = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.3, metalness: 0.9 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: PALETTE.ribbon, roughness: 0.9 });

  const P = new THREE.Vector3(0, TYPE_POINT.y, TYPE_POINT.z);
  const F = new THREE.Vector3(0, p.fulcrumY, p.fulcrumZ);
  const axis = P.clone().sub(F).normalize();                 // fulcrum → type point

  // Basis in the segment's plane: `down` is the in-plane direction closest to world −Y, so the
  // fan hangs below the axis and opens sideways like a real basket.
  const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
  const down = new THREE.Vector3().crossVectors(side, axis).normalize();
  if (down.y > 0) down.negate();

  // ---- the segment: an arc in that plane, which is where the slots would be cut ----
  const arc = ((p.spread * 2 + 28) * Math.PI) / 180;
  const segment = new THREE.Mesh(
    new THREE.TorusGeometry(p.segmentR, 0.0026, 8, 48, arc), nickel);
  segment.position.copy(F);
  // torus starts at local +X and sweeps toward +Y: aim it so the sweep is centred on `down`
  segment.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    down.clone().applyAxisAngle(axis, -arc / 2),
    down.clone().applyAxisAngle(axis, -arc / 2 + Math.PI / 2),
    axis));
  segment.castShadow = true;
  g.add(segment);

  // ---- the bars ----
  const bladeGeo = new THREE.BoxGeometry(p.barT, BLADE, p.barW);         // shared across all bars
  const headGeo = MK.rbGeo(p.headW, p.headH, p.headT, 0.0008);
  const slugGeo = new THREE.BoxGeometry(p.headW * 0.62, p.headH * 0.34, 0.0007);
  const restRad = (p.rest * Math.PI) / 180;
  const bars = [];

  for (let i = 0; i < p.count; i++) {
    const t = p.count === 1 ? 0.5 : i / (p.count - 1);
    const phi = ((-p.spread + t * p.spread * 2) * Math.PI) / 180;
    const radial = down.clone().applyAxisAngle(axis, phi);
    const pivot = F.clone().addScaledVector(radial, p.segmentR);
    const dir = P.clone().sub(pivot).normalize();                        // pivot → type point
    const hinge = new THREE.Vector3().crossVectors(axis, radial).normalize();

    const bar = new THREE.Group();
    bar.position.copy(pivot);
    // local +Y runs up the blade, local +X is the hinge, so `rest` is a rotation about the hinge
    const basis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
      hinge, dir, new THREE.Vector3().crossVectors(hinge, dir)));

    const blade = new THREE.Mesh(bladeGeo, steel);
    blade.position.y = BLADE / 2;
    blade.castShadow = true;
    bar.add(blade);

    const typeHead = new THREE.Mesh(headGeo, head);
    typeHead.position.y = BLADE + p.headH * 0.30;
    typeHead.castShadow = true;
    bar.add(typeHead);
    for (const sy of [-1, 1]) {                                          // upper and lower case slug
      const slug = new THREE.Mesh(slugGeo, nickel);
      slug.position.set(0, BLADE + p.headH * 0.30 + sy * p.headH * 0.24, p.headT / 2);
      bar.add(slug);
    }

    bar.userData = { basis, hinge, rest: restRad };
    if (i === Math.floor(p.count / 2)) bar.name = 'striker';
    bars.push(bar);
    g.add(bar);
  }

  /** t = 0 → resting in the basket, t = 1 → head on the platen at the type point. */
  const q = new THREE.Quaternion();
  const setBar = (i, t) => {
    const bar = bars[i];
    if (!bar) return;
    q.setFromAxisAngle(bar.userData.hinge, bar.userData.rest * (1 - t));
    bar.quaternion.copy(q.multiply(bar.userData.basis));
  };
  for (let i = 0; i < bars.length; i++) setBar(i, 0);

  // ---- ribbon: two spools on the well floor, the ribbon rising to a vibrator at the type point ----
  const spoolGeo = MK.latheGeo([
    [0, 0], [p.spoolR, 0], [p.spoolR, 0.0016],
    [p.spoolR * 0.42, 0.0028], [p.spoolR * 0.42, p.spoolH - 0.0028],
    [p.spoolR, p.spoolH - 0.0016], [p.spoolR, p.spoolH], [0, p.spoolH],
  ], 28);
  const spoolY = ASSEMBLY.shellTop;
  for (const sx of [-1, 1]) {
    const spool = new THREE.Group();
    spool.name = sx < 0 ? 'spoolleft' : 'spoolright';
    spool.position.set(sx * p.spoolX, spoolY, p.spoolZ);
    const cheeks = new THREE.Mesh(spoolGeo, nickel);
    cheeks.castShadow = true;
    spool.add(cheeks);
    const wound = new THREE.Mesh(
      new THREE.CylinderGeometry(p.spoolR * 0.80, p.spoolR * 0.80, p.spoolH * 0.62, 24), ribbonMat);
    wound.position.y = p.spoolH / 2;
    spool.add(wound);
    g.add(spool);
  }

  // the two runs of ribbon, each a flat strip from its spool up to just under the type point
  const vibratorY = TYPE_POINT.y - 0.008;
  for (const sx of [-1, 1]) {
    const from = new THREE.Vector3(sx * p.spoolX, spoolY + p.spoolH * 0.55, p.spoolZ);
    const to = new THREE.Vector3(sx * 0.010, vibratorY, TYPE_POINT.z + 0.004);
    const mid = from.clone().lerp(to, 0.5);
    const len = from.distanceTo(to);
    const run = new THREE.Mesh(new THREE.BoxGeometry(p.ribbonW, len, 0.0004), ribbonMat);
    run.position.copy(mid);
    run.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    g.add(run);
  }

  // vibrator fork: what lifts the ribbon in front of the type point on every strike
  const fork = new THREE.Group();
  fork.name = 'vibrator';
  fork.position.set(0, vibratorY, TYPE_POINT.z + 0.005);
  const forkBar = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.0022, 0.0016), nickel);
  fork.add(forkBar);
  for (const sx of [-1, 1]) {
    const tine = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.010, 0.0016), nickel);
    tine.position.set(sx * 0.014, 0.005, 0);
    fork.add(tine);
  }
  g.add(fork);

  g.userData.setBar = setBar;
  g.userData.bars = bars;
  return g;
}
