// prism — the hump, the accessory shoe on top of it, and the eyepiece it feeds at the back.
// Datum: mounted. Built in the camera's floor coordinates: the hump stands on the top plate at
// y = BODY.h, and the eyepiece sits at the prism's own mid-height (params rule 1).
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { PRISM, EYEPIECE, BODY, PALETTE } from '../params.js';
import { prismoid } from '/runtime/forms.js';

export const params = PRISM;
export const datum = 'mounted';

export const inventory = [
  `a prismoid, not a dome: ${params.w0 * 1000}×${params.d0 * 1000}mm at the plate rising to a `
    + `${params.w1 * 1000}×${params.d1 * 1000}mm ridge over ${params.h * 1000}mm — four flat slopes`,
  `the ridge leans ${Math.abs(params.dz) * 1000}mm back, toward the eye`,
  `accessory shoe ${params.shoeW * 1000}mm across, two rails and a centre contact`,
  `eyepiece ${EYEPIECE.w * 1000}×${EYEPIECE.h * 1000}mm at y = ${Math.round(EYEPIECE.y * 1000)}mm — `
    + "the prism's own centre line, derived, not typed",
  'the finder glass is dark and polished, so it reads as glass rather than a black rectangle',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'prism';

  const chrome = new THREE.MeshStandardMaterial({ color: PALETTE.chrome, roughness: 0.19, metalness: 0.95 });
  const bright = new THREE.MeshStandardMaterial({ color: PALETTE.chromeBright, roughness: 0.12, metalness: 0.97 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.5, metalness: 0.3 });
  const finder = new THREE.MeshStandardMaterial({ color: 0x0b1116, roughness: 0.06, metalness: 0.9 });

  const hump = new THREE.Mesh(prismoid(p.w0, p.d0, p.w1, p.d1, p.h, p.dz), chrome);
  hump.position.set(0, p.baseY, p.z);
  hump.castShadow = hump.receiveShadow = true;
  g.add(hump);

  // ---- accessory shoe: base, two rails, one contact ----
  const shoe = new THREE.Group();
  shoe.position.set(0, p.apexY - 0.0004, p.z + p.dz);
  const base = new THREE.Mesh(MK.rbGeo(p.shoeW, p.shoeH * 0.5, p.shoeD, 0.0007), chrome);
  base.position.y = p.shoeH * 0.25;
  shoe.add(base);
  const railGeo = MK.rbGeo(0.0026, p.shoeH * 0.62, p.shoeD, 0.0006);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, bright);
    rail.position.set(sx * (p.shoeW / 2 - 0.0013), p.shoeH * 0.62, 0);
    rail.castShadow = true;
    shoe.add(rail);
  }
  const contact = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.0010, 12), bright);
  contact.position.y = p.shoeH * 0.5;
  shoe.add(contact);
  g.add(shoe);

  // ---- eyepiece, on the back face ----
  const zBack = -BODY.d / 2;
  const frame = new THREE.Mesh(MK.rbGeo(EYEPIECE.w, EYEPIECE.h, EYEPIECE.t, 0.0018), chrome);
  frame.position.set(0, EYEPIECE.y, zBack - EYEPIECE.t / 2 + 0.0012);
  frame.castShadow = true;
  g.add(frame);
  // The surround used to sit 0.4mm behind the frame — a floating plate with daylight between
  // the two — and its own back face landed EXACTLY on the finder glass, which is why the
  // eyepiece came out stair-stepped: two coplanar faces, tearing along the whole rectangle.
  // It overlaps the frame now, and the glass stands proud of it.
  const surround = new THREE.Mesh(
    MK.rbGeo(EYEPIECE.w - 0.0030, EYEPIECE.h - 0.0030, EYEPIECE.t * 0.5, 0.0012), dark);
  surround.position.set(0, EYEPIECE.y, zBack - EYEPIECE.t + 0.0004);
  g.add(surround);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(EYEPIECE.w - 0.0072, EYEPIECE.h - 0.0068), finder);
  glass.position.set(0, EYEPIECE.y, zBack - EYEPIECE.t - EYEPIECE.glassInset);
  glass.rotation.y = Math.PI;
  g.add(glass);

  return g;
}
