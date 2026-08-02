// tonearm — post, sloping arm, soundbox head, needle.
// Datum: local origin is the post's foot on the cabinet top. The arm swings about local Y.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { TONEARM, PALETTE } from '../params.js';

export const params = TONEARM;
export const datum = 'mounted';

// Numbers come from params, never retyped — an inventory line that drifts from the geometry
// it describes is worse than no inventory at all.
export const inventory = [
  `post ${params.postR * 2000}mm across vs arm ${params.armR * 2000}mm — the arm reads light because the post is heavy`,
  `arm slopes ${params.armDrop}° down toward the record, it does not run flat`,
  'soundbox head is a rounded slab with a mica face, not a bare cylinder',
  `needle is a ${params.needleLen * 1000}mm cone hanging below the head`,
  'arm group named for pivoting (cue on / cue off)',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'tonearm';

  const nickel = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.28, metalness: 0.85 });
  const brass = new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.32, metalness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.6 });

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(p.postR, p.postR * 1.18, p.postH, 20), nickel);
  post.position.y = p.postH / 2;
  post.castShadow = true;
  g.add(post);

  // --- the swinging half ---
  const arm = new THREE.Group();
  arm.name = 'arm';                                 // pivot: rotate about Y to cue on and off
  arm.position.y = p.postH;
  arm.rotation.z = (p.armDrop * Math.PI) / 180;     // -X end drops toward the record
  g.add(arm);

  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(p.armR, p.armR * 0.86, p.armLen, 16).rotateZ(Math.PI / 2), nickel);
  tube.position.x = -p.armLen / 2;
  tube.castShadow = true;
  arm.add(tube);

  const head = new THREE.Group();
  head.position.x = -p.armLen;
  arm.add(head);

  const box = new THREE.Mesh(MK.rbGeo(p.headD, p.headH, p.headW, 0.009), brass);
  box.castShadow = true;
  head.add(box);

  const mica = new THREE.Mesh(
    new THREE.CylinderGeometry(p.headW * 0.36, p.headW * 0.36, 0.0025, 24).rotateX(Math.PI / 2), dark);
  mica.position.z = p.headW / 2 + 0.001;
  head.add(mica);

  const needle = new THREE.Mesh(
    new THREE.ConeGeometry(0.0016, p.needleLen, 10), nickel);
  needle.position.y = -p.headH / 2 - p.needleLen / 2 + 0.002;
  needle.rotation.x = Math.PI;
  head.add(needle);

  return g;
}
