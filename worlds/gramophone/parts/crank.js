// crank — the winding handle on the right cheek.
// Datum: local origin is where the shaft leaves the cabinet; the shaft runs along +X.
import * as THREE from 'three';
import { CRANK, PALETTE } from '../params.js';

export const params = CRANK;
export const datum = 'mounted';

export const inventory = [
  'shaft runs 70mm clear of the cheek before it bends',
  'crank throw 62mm — the handle sits well below the shaft axis at rest',
  'turned wooden grip, free to spin on its own pin',
  'whole crank named so it can wind',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'crank';

  const steel = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.34, metalness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: PALETTE.woodTrim, roughness: 0.55 });

  const spin = new THREE.Group();
  spin.name = 'wind';                                  // pivot: rotate about X to wind the spring
  g.add(spin);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(p.shaftR, p.shaftR, p.shaftLen, 16).rotateZ(Math.PI / 2), steel);
  shaft.position.x = p.shaftLen / 2;
  shaft.castShadow = true;
  spin.add(shaft);

  const web = new THREE.Mesh(
    new THREE.CylinderGeometry(p.shaftR * 0.9, p.shaftR * 0.9, p.throw, 12), steel);
  web.position.set(p.shaftLen, -p.throw / 2, 0);
  web.castShadow = true;
  spin.add(web);

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(p.shaftR * 0.7, p.shaftR * 0.7, p.handleLen * 1.15, 12).rotateZ(Math.PI / 2), steel);
  pin.position.set(p.shaftLen + p.handleLen * 0.1, -p.throw, 0);
  spin.add(pin);

  const grip = new THREE.Mesh(
    new THREE.LatheGeometry([
      [0, 0], [p.handleR * 0.55, 0], [p.handleR, p.handleLen * 0.18],
      [p.handleR, p.handleLen * 0.82], [p.handleR * 0.55, p.handleLen], [0, p.handleLen],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 20).rotateZ(Math.PI / 2), wood);
  grip.position.set(p.shaftLen - p.handleLen * 0.25, -p.throw, 0);
  grip.castShadow = true;
  spin.add(grip);

  return g;
}
