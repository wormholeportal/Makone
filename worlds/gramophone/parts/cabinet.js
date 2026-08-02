// cabinet — the oak case everything else stands on.
// Datum: y=0 is the floor the feet touch, +Z is the grille side (the front).
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { CABINET, PALETTE } from '../params.js';

export const params = CABINET;

export const inventory = [
  'top plate overhangs 12mm on every side, own fillet',
  'moulding band 30mm below the top plate, proud of the body',
  'four turned bun feet, inset 40mm from the corners',
  'front grille: recessed dark panel behind 5 vertical slats',
  'crank boss on the right cheek, brass collar',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'cabinet';

  // Wood is not lacquer: keep roughness high or the studio environment turns mahogany into plastic.
  const bodyMat = new THREE.MeshStandardMaterial({ color: PALETTE.woodBody, roughness: 0.74, metalness: 0.04 });
  const topMat = new THREE.MeshStandardMaterial({ color: PALETTE.woodTop, roughness: 0.62, metalness: 0.04 });
  const trimMat = new THREE.MeshStandardMaterial({ color: PALETTE.woodTrim, roughness: 0.8 });
  const brassMat = new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9 });

  const body = new THREE.Mesh(MK.rbGeo(p.w, p.h, p.d, p.round), bodyMat);
  body.position.y = p.footH + p.h / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  const top = new THREE.Mesh(
    MK.rbGeo(p.w + p.topOverhang * 2, p.topThick, p.d + p.topOverhang * 2, 0.004), topMat);
  top.position.y = p.footH + p.h + p.topThick / 2;
  top.castShadow = top.receiveShadow = true;
  g.add(top);

  const trim = new THREE.Mesh(
    MK.rbGeo(p.w + 0.008, p.trimThick, p.d + 0.008, 0.003), trimMat);
  trim.position.y = p.footH + p.h - p.trimDrop;
  trim.castShadow = true;
  g.add(trim);

  // --- four bun feet, one geometry between them (E4) ---
  const footGeo = new THREE.SphereGeometry(p.footR, 18, 12);
  footGeo.scale(1, p.footH / p.footR / 2, 1);
  const inset = p.footInset;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = new THREE.Mesh(footGeo, trimMat);
    foot.position.set(sx * (p.w / 2 - inset), p.footH / 2, sz * (p.d / 2 - inset));
    foot.castShadow = true;
    g.add(foot);
  }

  // --- front grille: dark recess, then slats in front of it ---
  const frontZ = p.d / 2 + 0.0015;
  const grilleY = p.footH + p.h * 0.42;
  const recess = new THREE.Mesh(
    new THREE.PlaneGeometry(p.grilleW, p.grilleH),
    new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.95 }));
  recess.position.set(0, grilleY, frontZ);
  g.add(recess);

  const slatGeo = MK.rbGeo(0.011, p.grilleH + 0.012, 0.010, 0.003);   // shared across slats
  const step = p.grilleW / (p.grilleSlats + 1);
  for (let i = 1; i <= p.grilleSlats; i++) {
    const slat = new THREE.Mesh(slatGeo, trimMat);
    slat.position.set(-p.grilleW / 2 + step * i, grilleY, frontZ + 0.004);
    slat.castShadow = true;
    g.add(slat);
  }

  // --- crank boss on the right cheek ---
  const boss = new THREE.Mesh(
    new THREE.CylinderGeometry(p.crankBossR, p.crankBossR, 0.012, 20).rotateZ(Math.PI / 2), brassMat);
  boss.position.set(p.w / 2 + 0.004, p.footH + p.h * 0.55, 0.02);
  boss.castShadow = true;
  g.add(boss);

  return g;
}
