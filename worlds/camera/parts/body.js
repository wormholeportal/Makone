// body — the die-cast shell: chrome top plate, vulcanite band, chrome base, and the mount.
// Datum: y=0 is the baseplate, +Z is the way the lens looks. Built in the camera's own
// coordinates, so main.js adds every part at the origin.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { BODY, MOUNT, PALETTE } from '../params.js';
import { shellGeo, grainTexture } from '/runtime/forms.js';

export const params = BODY;

export const inventory = [
  `${params.w * 1000} × ${params.h * 1000} × ${params.d * 1000} mm — a 35mm body, `
    + 'not a shoebox: the ends are round, the corners are not',
  `three stacked shells: ${params.topH * 1000}mm chrome top, ${params.leatherH * 1000}mm covering, `
    + `${params.baseH * 1000}mm chrome base, the covering inset ${params.inset * 1000}mm all round`,
  `bayonet flange ø${MOUNT.flangeR * 2000}mm with ${MOUNT.lugs} claws, and a throat that goes `
    + `${MOUNT.throatDepth * 1000}mm INTO the body — a flat front reads as a sticker`,
  `lens axis ${MOUNT.axisY * 1000}mm above the base, on x = 0`,
  'red index dot at the top of the flange, a tripod bush, and two strap lugs — each an eyelet '
    + 'with a split ring genuinely threaded through it, hanging free against the covering',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'body';

  const chrome = new THREE.MeshStandardMaterial({ color: PALETTE.chrome, roughness: 0.19, metalness: 0.95 });
  const bright = new THREE.MeshStandardMaterial({ color: PALETTE.chromeBright, roughness: 0.11, metalness: 0.97 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.55, metalness: 0.35 });
  // the covering is the only surface on the camera that is not smooth; without the grain it
  // reads as moulded plastic however dark it is
  const grain = grainTexture({ repeat: [12, 5], cell: 5 });
  const skin = new THREE.MeshStandardMaterial({
    color: PALETTE.leather, roughness: 0.88, metalness: 0.05, bumpMap: grain, bumpScale: 1.4 });
  const red = new THREE.MeshStandardMaterial({ color: PALETTE.red, roughness: 0.4 });

  // ---- the three shells ----
  // A stadium in plan — round ends, straight front and back — with the top and bottom edges
  // filleted. One extruded profile per shell, so there is no seam between "the box" and "the
  // round end" to get wrong.
  const shell = (h, y, mat, inset = 0) => {
    const m = new THREE.Mesh(
      shellGeo(p.w - inset * 2, p.d - inset * 2, h, p.endRound - inset, p.round * 0.62), mat);
    m.position.y = y;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  shell(p.baseH, 0, chrome);
  shell(p.leatherH, p.baseH, skin, p.inset);
  shell(p.topH, p.baseH + p.leatherH, chrome);

  // ---- the mount ----
  // The flange is an ANNULUS, not a disc: the first cut capped the throat with a solid cylinder
  // and the front of the camera read as a grey coin.
  const zFront = p.d / 2;
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(MOUNT.flangeR, MOUNT.flangeR, MOUNT.flangeT, 40, 1, true)
      .rotateX(Math.PI / 2), chrome);
  flange.position.set(0, MOUNT.axisY, zFront + MOUNT.flangeT / 2);
  flange.castShadow = true;
  const face = new THREE.Mesh(new THREE.RingGeometry(MOUNT.throatR, MOUNT.flangeR, 40), chrome);
  face.position.set(0, MOUNT.axisY, zFront + MOUNT.flangeT);
  g.add(flange, face);

  // the throat: a tube going backwards into the body, with a black mirror box floor at the end,
  // so the front of the camera has depth from every angle instead of one flat disc
  const throat = new THREE.Mesh(
    new THREE.CylinderGeometry(MOUNT.throatR, MOUNT.throatR, MOUNT.throatDepth, 36, 1, true)
      .rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.9, side: THREE.BackSide }));
  throat.position.set(0, MOUNT.axisY, zFront - MOUNT.throatDepth / 2 + MOUNT.flangeT);
  g.add(throat);
  const mirror = new THREE.Mesh(
    new THREE.CircleGeometry(MOUNT.throatR, 36),
    new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.08, metalness: 1 }));
  mirror.position.set(0, MOUNT.axisY, zFront + MOUNT.flangeT - MOUNT.throatDepth);
  mirror.rotation.x = -0.55;                            // the reflex mirror, tilted up at the prism
  g.add(mirror);

  // bayonet claws, on the flange face
  const clawGeo = new THREE.TorusGeometry(MOUNT.throatR + 0.0018, 0.0011, 6, 14, (Math.PI * 2) / 5);
  for (let i = 0; i < MOUNT.lugs; i++) {
    const claw = new THREE.Mesh(clawGeo, bright);
    claw.position.set(0, MOUNT.axisY, zFront + MOUNT.flangeT - 0.0009);
    claw.rotation.z = (i / MOUNT.lugs) * Math.PI * 2;
    g.add(claw);
  }
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(MOUNT.indexR, MOUNT.indexR, 0.0012, 14)
    .rotateX(Math.PI / 2), red);
  dot.position.set(0, MOUNT.axisY + MOUNT.flangeR - 0.0038, zFront + MOUNT.flangeT + 0.0004);
  g.add(dot);

  // lens release, right of the mount
  const release = new THREE.Mesh(MK.rbGeo(0.0060, 0.0125, 0.0042, 0.0016), chrome);
  release.position.set(MOUNT.flangeR + 0.0055, MOUNT.axisY, zFront - 0.0015);
  release.castShadow = true;
  g.add(release);

  // ---- strap lugs, tripod bush ----
  // The lugs sit on the FRONT face, near the ends. On the end faces they either vanished inside
  // the shell or added 14mm to a 142mm camera — the front face is where they can stand proud of
  // the body without touching the width the facts table reads.
  //
  // A lug is TWO parts, and it has to be, because one part cannot be threaded through anything:
  // an eyelet standing off the covering, and a split ring hanging in it. It used to be a single
  // 234° torus arc laid flat on the leather — an arc has two cut ends, they floated in mid-air,
  // and with nothing passing through it the whole thing read as a chrome letter C stuck on.
  //
  // The eyelet's hole runs along X — sideways, not out of the body — and that is the load-bearing
  // choice. A ring hangs in a plane that CONTAINS its bar's axis, so a hole along X gives a ring
  // in the XY plane: flat against the front, a full circle from the camera's own front view. Bore
  // the hole along Z instead and the same ring hangs edge-on, and a strap ring seen edge-on is a
  // chrome line segment floating off the body — the shape this started as.
  const eyeGeo = new THREE.TorusGeometry(0.0020, 0.0008, 10, 28).rotateY(Math.PI / 2);
  const ringGeo = new THREE.TorusGeometry(0.0038, 0.00062, 10, 36);
  for (const sx of [-1, 1]) {
    const lug = new THREE.Group();
    lug.position.set(sx * (p.w / 2 - 0.0125), p.baseH + p.leatherH - 0.0055, p.d / 2 - 0.0009);
    const eye = new THREE.Mesh(eyeGeo, bright);
    eye.position.z = 0.0022;                            // its underside just breaks the covering
    eye.castShadow = true;
    // the ring's top arc crosses the eyelet's bore dead centre — that is what "threaded" means
    // here, not two rings that happen to overlap on screen
    const ring = new THREE.Mesh(ringGeo, bright);
    ring.position.set(0, -0.0044, 0.0022);
    ring.castShadow = true;
    lug.add(eye, ring);
    g.add(lug);
  }
  const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0048, 0.0026, 20), dark);
  bush.position.set(0.0180, 0.0013, 0);
  g.add(bush);

  return g;
}
