// turntable — platter, felt, a record with real grooves, spindle.
// Datum: local origin is the cabinet top face it sits on. Spins about its own Y.
import * as THREE from 'three';
import { TURNTABLE, PALETTE } from '../params.js';

export const params = TURNTABLE;
export const datum = 'mounted';

export const inventory = [
  'cast platter edge, 13mm thick, darker than the felt',
  'green felt inset 7mm from the platter rim',
  'record grooves: concentric rings drawn into a generated canvas',
  'paper label, 43mm radius, off-centre-safe (drawn, not textured)',
  'spindle proud of the record by ~25mm',
];

/** Groove texture, generated. Pure code — nothing downloaded (D4). */
function grooveTexture(p) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#121216';
  x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(255,255,255,0.10)';
  x.lineWidth = 1;
  for (let i = 0; i < p.grooves; i++) {
    const t = i / p.grooves;
    const r = (S / 2) * (0.40 + 0.58 * t);
    x.beginPath();
    x.arc(S / 2, S / 2, r, 0, Math.PI * 2);
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'turntable';

  const platter = new THREE.Group();
  platter.name = 'platter';                       // pivot: this is what turns
  g.add(platter);

  const metal = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.45, metalness: 0.7 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(p.platterR, p.platterR * 0.985, p.platterH, 48), metal);
  disc.position.y = p.platterH / 2;
  disc.castShadow = disc.receiveShadow = true;
  platter.add(disc);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(p.feltR, p.feltR, p.feltH, 48),
    new THREE.MeshStandardMaterial({ color: PALETTE.felt, roughness: 0.95 }));
  felt.position.y = p.platterH + p.feltH / 2;
  felt.receiveShadow = true;
  platter.add(felt);

  // Shellac, not a mirror: below ~0.5 roughness a flat disc facing up mirrors the whole studio
  // and the record renders WHITE from some azimuths while staying black from others.
  const vinyl = new THREE.MeshStandardMaterial({ color: PALETTE.record, roughness: 0.5 });
  const grooved = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grooveTexture(p), roughness: 0.55 });
  const record = new THREE.Mesh(
    new THREE.CylinderGeometry(p.recordR, p.recordR, p.recordH, 64),
    [vinyl, grooved, vinyl]);                     // side, top, bottom
  record.position.y = p.platterH + p.feltH + p.recordH / 2;
  record.castShadow = record.receiveShadow = true;
  platter.add(record);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(p.labelR, p.labelR, 0.0004, 40),
    new THREE.MeshStandardMaterial({ color: PALETTE.label, roughness: 0.85 }));
  label.position.y = p.platterH + p.feltH + p.recordH + 0.0002;
  platter.add(label);

  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(p.spindleR, p.spindleR, p.spindleH, 14), metal);
  spindle.position.y = p.spindleH / 2;
  spindle.castShadow = true;
  g.add(spindle);

  return g;
}
