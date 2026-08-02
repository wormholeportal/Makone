// horn — the brass flower. Everything else is furniture; this part is the machine's face.
// Datum: local origin is the mounting collar on the cabinet top (not the floor), +Z is front.
import * as THREE from 'three';
import { HORN, PALETTE } from '../params.js';

export const params = HORN;
export const datum = 'mounted';          // rises off the cabinet, so y=0 is not its contact face

export const inventory = [
  `flare is a power curve (t^${params.flare}), not a cone — thin at the throat, opens late`,
  `rolled rim: lip curls outward then back under, ${params.rimRoll * 1000}mm`,
  `elbow rises ${params.elbowRise * 1000}mm and reaches ${params.elbowReach * 1000}mm forward before the bell starts`,
  `bell leans ${params.tilt}° forward, and the elbow exits along that same axis (no crease at the joint)`,
  'mounting collar at the base, one ring, darker brass',
];

/** Lathe profile of the bell: throat → power-curve flare → rolled rim.
 *  The flare exponent is the whole character of the horn — 1.0 is a traffic cone, 2.4 sings. */
function bellProfile(p, steps = 26) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([p.throatR + (p.bellR - p.throatR) * t ** p.flare, p.length * t]);
  }
  const R = p.rimRoll;
  pts.push([p.bellR + R * 0.50, p.length + R * 0.45]);
  pts.push([p.bellR + R * 0.85, p.length + R * 0.05]);
  pts.push([p.bellR + R * 0.62, p.length - R * 0.45]);
  pts.push([p.bellR + R * 0.14, p.length - R * 0.52]);
  return pts;
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'horn';

  const brass = new THREE.MeshStandardMaterial({
    color: PALETTE.brass, roughness: 0.26, metalness: 0.92, side: THREE.DoubleSide });
  const brassDark = new THREE.MeshStandardMaterial({
    color: PALETTE.brassDark, roughness: 0.38, metalness: 0.85 });

  // --- elbow: a short curved tube from the cabinet up to where the bell starts ---
  // Its exit tangent must match the bell's tilt, or the two meet in a visible crease and the
  // horn reads as two glued objects instead of one pipe. It also runs a little past the bell's
  // throat so the seam sits inside the flare.
  const tiltRad = (p.tilt * Math.PI) / 180;
  const axis = new THREE.Vector3(0, Math.cos(tiltRad), Math.sin(tiltRad));
  const bellBase = new THREE.Vector3(0, p.elbowRise, p.elbowReach);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, p.elbowRise * 0.5, p.elbowReach * 0.18),
    bellBase.clone().addScaledVector(axis, -0.02),
    bellBase.clone().addScaledVector(axis, 0.03),
  ]);
  const elbow = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, p.throatR, 16, false), brass);
  elbow.castShadow = true;
  g.add(elbow);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(p.throatR * 1.6, p.throatR * 1.9, 0.014, 20), brassDark);
  collar.position.y = 0.006;
  collar.castShadow = true;
  g.add(collar);

  // --- bell: leans forward off the top of the elbow ---
  const bell = new THREE.Group();
  bell.name = 'bell';                                   // pivot: the horn can be swung by name
  bell.position.copy(bellBase);
  bell.rotation.x = tiltRad;
  const lathe = new THREE.Mesh(
    new THREE.LatheGeometry(bellProfile(p).map(([r, y]) => new THREE.Vector2(r, y)), p.segments), brass);
  lathe.castShadow = lathe.receiveShadow = true;
  bell.add(lathe);
  g.add(bell);

  return g;
}
