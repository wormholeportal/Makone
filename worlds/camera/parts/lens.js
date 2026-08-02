// lens — a 50mm standard prime: a stack of rings on one axis, two of which turn.
// Datum: mounted. Built on the camera's lens axis (y = MOUNT.axisY, +Z out of the mount face),
// so it goes on at the origin with the body.
// Pivots: `aperturering`, `focusring` — a scene that wants to stop it down can.
//
// A turning ring is THREE pieces, and the reason is a bug rather than a preference. The first
// cut made each ring one solid fluted puck with a chrome ferrule pushed into it:
//
//   * the ferrule sat at mid-tooth radius, so the teeth chopped it into 46 disconnected chips
//     and the ring read as broken — a ring with pieces missing out of it;
//   * the ferrule's end cap landed EXACTLY on the puck's end cap, and two coplanar faces on a
//     part that turns is a strobe: the ring flashed black/chrome every frame of the wind.
//
// So a ring is now a smooth root cylinder the full length, a knurl band across the middle, and
// a turned bright band at each end — three solids that overlap radially and never share a plane.
import * as THREE from 'three';
import { LENS, MOUNT, PALETTE } from '../params.js';
import { knurlGeo, scaleTexture, dialTexture } from '/runtime/forms.js';

export const params = LENS;
export const datum = 'mounted';

const SEG = 72;                     // 40 left a visible polygon on a ø64 ring, head-on

export const inventory = [
  `five rings stacked over ${Math.round(params.length * 1000)}mm: collar → aperture → scale → `
    + 'focus → bezel, and the focus ring is the widest of them — the barrel has one waist',
  `grips specified by pitch, not by count: ${params.knurlPitch * 1000}mm rolled knurl on the focus `
    + `ring, ${params.gripPitch * 1000}mm milled scallops on the aperture ring`,
  'each turning ring is root cylinder + knurl band + two bright ferrules, overlapping radially '
    + 'and sharing no plane — a full ferrule, and nothing to strobe when it turns',
  `f-stops ${params.stops[0]}–${params.stops[params.stops.length - 1]} and a distance scale, `
    + 'both drawn to a canvas (D4), with a red index line between them',
  `front element ø${params.glassR * 2000}mm bulging ${params.glassSag * 1000}mm, sunk behind a `
    + `ø${params.filterR * 2000}mm filter thread with the focal length engraved round the lip`,
  'the element is tinted deep blue and only part metal, so the room comes back as ONE blue '
    + 'reflection — a full mirror returns the studio window as a white flare, a dielectric goes '
    + 'flat black, and the lens has been both',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'lens';
  g.position.y = MOUNT.axisY;

  const barrel = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.42, metalness: 0.55 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.35, metalness: 0.65 });
  const knurlMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.44, metalness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: PALETTE.chrome, roughness: 0.18, metalness: 0.95 });
  const bright = new THREE.MeshStandardMaterial({ color: PALETTE.chromeBright, roughness: 0.12, metalness: 0.96 });
  // The front element is the one surface with two ways to be wrong, and both were tried:
  //   metalness 1, envMapIntensity 2.6 — the element multiplies the environment, hands back the
  //     studio's window whole, and the lens wears a blown white smear. That is the flash.
  //   metalness 0 — a dielectric reflects ~4% head-on, so the element goes flat black and the
  //     lens is a hole again, which is the bug the mirror was reaching for in the first place.
  // A coated element is neither: it is mostly-reflective, tinted, and its colour SWINGS with the
  // angle. So: part metal for a reflection that survives head-on, a deep teal base so what comes
  // back is blue rather than white, env at ~1 so it reflects the room without becoming it, and
  // `iridescence` — a thin film over the tint, which is literally what the coating is.
  const glassFront = new THREE.MeshPhysicalMaterial({
    // The tint is what keeps the room's window from coming back white. A metal's reflection is
    // base × environment, and the window is far brighter than 1, so a pale blue base clips in all
    // three channels and reads as a flare. A deep, saturated base clips in BLUE only — which is
    // the one reflection the lens is supposed to be holding.
    color: 0x1d5f86, roughness: 0.085, metalness: 0.95, envMapIntensity: 1.15,
    clearcoat: 1, clearcoatRoughness: 0.02,
    iridescence: 0.55, iridescenceIOR: 1.45, iridescenceThicknessRange: [240, 520],
  });
  const glassBack = new THREE.MeshPhysicalMaterial({
    color: 0x8a5a2e, roughness: 0.12, metalness: 0.9, envMapIntensity: 0.9,
    clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 0.5, iridescenceIOR: 1.4, iridescenceThicknessRange: [260, 560],
  });

  // ---- helpers -------------------------------------------------------------
  /** A closed cylinder on the lens axis, spanning [zA, zB]. Closed on purpose: the rings butt
   *  against each other at different radii, and a cap is what turns that step into a shoulder
   *  instead of a hole you can see the inside of the barrel through. */
  const cyl = (rad, zA, zB, mat, { open = false, seg = SEG } = {}) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rad, rad, zB - zA, seg, 1, open).rotateX(Math.PI / 2), mat);
    m.position.z = (zA + zB) / 2;
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  /** The grip band of a turning ring. The bore is sunk well inside the root cylinder, so the
   *  band's own inner wall and inner cap ring are buried and only the teeth are ever visible. */
  const knurl = (rCrest, zA, zB, pitch, depth) => {
    const m = new THREE.Mesh(
      knurlGeo(rCrest, zB - zA, { pitch, depth, bore: rCrest - depth * 3.2 }).rotateX(Math.PI / 2),
      knurlMat);
    m.position.z = (zA + zB) / 2;
    m.castShadow = m.receiveShadow = true;
    return m;
  };

  // A closed core, so no ring gap ever shows daylight through the lens. It stops short of the
  // front: the last 14mm belong to the glass, and a core that ran the whole length would swallow
  // the second element whole.
  const coreLen = p.length - 0.0140;
  const core = cyl(p.collarR - 0.0012, p.z0, p.z0 + coreLen, barrel, { seg: 32 });
  g.add(core);

  let z = p.z0;

  // ---- collar: the bayonet, plain chrome ----
  g.add(cyl(p.collarR, z, z + p.collarL, chrome));
  z += p.collarL;

  // ---- aperture ring: milled scallops at the back, the stops printed in front ----
  {
    const aperture = new THREE.Group();
    aperture.name = 'aperturering';
    const rRoot = p.apertureR - p.gripDepth;
    aperture.add(cyl(rRoot, z, z + p.apertureL, ringMat));
    // the grip is the half nearest the body — that is the half a finger can reach past the
    // focus ring, and it leaves the front half for the numbers
    aperture.add(knurl(p.apertureR, z + 0.0008, z + p.apertureL * 0.46, p.gripPitch, p.gripDepth));
    // the printed band stands 0.2mm proud of the root, so nothing is coplanar with it
    const stops = cyl(rRoot + 0.0002, z + p.apertureL * 0.50, z + p.apertureL - 0.0008,
      new THREE.MeshStandardMaterial({
        map: scaleTexture(p.stops, { accentAt: p.stops.length - 1 }), roughness: 0.4, metalness: 0.5,
      }), { open: true });
    aperture.add(stops);
    // one bright chamfer where the ring meets the collar: it is what stops the back of the
    // barrel reading as one continuous black tube
    aperture.add(cyl(rRoot + 0.0004, z + 0.0002, z + 0.0012, bright));
    z += p.apertureL;
    g.add(aperture);
  }

  // ---- the fixed scale ring, with the index line ----
  const scale = cyl(p.scaleR, z, z + p.scaleL,
    new THREE.MeshStandardMaterial({
      map: scaleTexture(p.distances, { bg: '#1b1d21', fg: '#e8e3d8' }), roughness: 0.45, metalness: 0.4,
    }), { open: true });
  g.add(scale);
  const index = new THREE.Mesh(
    new THREE.BoxGeometry(0.0009, 0.0018, p.scaleL * 0.9),
    new THREE.MeshStandardMaterial({ color: PALETTE.red, roughness: 0.4 }));
  index.position.set(0, p.scaleR + 0.0004, z + p.scaleL / 2);
  g.add(index);
  z += p.scaleL;

  // ---- focus ring: the big one, and the only fine knurl on the camera ----
  {
    const focus = new THREE.Group();
    focus.name = 'focusring';
    const rRoot = p.focusR - p.knurlDepth;
    focus.add(cyl(rRoot, z, z + p.focusL, ringMat));
    focus.add(knurl(p.focusR, z + 0.0034, z + p.focusL - 0.0034, p.knurlPitch, p.knurlDepth));
    // the ferrules: full circles, 0.4mm proud of the root, inset 0.4mm from the ends so neither
    // of their caps lands on the root's. Both facts are load-bearing — see the header.
    for (const zz of [z + 0.0004, z + p.focusL - 0.0030]) {
      focus.add(cyl(rRoot + 0.0004, zz, zz + 0.0026, bright));
    }
    z += p.focusL;
    g.add(focus);
  }

  // ---- bezel: outer wall, filter thread, and the engraved lip ----
  const zFront = z + p.bezelL;                          // the front face of the lens
  g.add(cyl(p.bezelR, z, zFront, ringMat, { open: true }));
  // the thread bore, seen from the INSIDE, so the front reads as a hole with a wall down to the
  // glass instead of a wall you can see past
  const zRetain = zFront - 0.0042;
  // `open` is not a detail here: a closed cylinder's rear cap is a solid ø53 disc sitting a
  // millimetre in front of the element, and that disc — not the material — is what turns the
  // lens into a black hole. It cost two rounds of glass-material tuning the first time and one
  // more when this helper was written with `open` defaulting to false.
  const throat = cyl(p.filterR, zRetain, zFront,
    new THREE.MeshStandardMaterial({ color: 0x0c0e11, roughness: 0.8, side: THREE.BackSide }),
    { open: true });
  g.add(throat);
  // the thread itself: three crests standing off the bore wall, which is all you ever see of it
  const threadGeo = new THREE.TorusGeometry(p.filterR - 0.00035, 0.00035, 6, 48);
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(threadGeo, ringMat);
    t.position.z = zFront - 0.0012 - i * 0.0013;
    g.add(t);
  }
  // the lip, with the focal length engraved round it — the one place a lens says what it is.
  // RingGeometry's uv runs 0..1 across the diameter, the same convention dialTexture draws to.
  const lip = new THREE.Mesh(
    new THREE.RingGeometry(p.filterR, p.bezelR, SEG, 1),
    new THREE.MeshStandardMaterial({
      map: dialTexture([p.name[0], '', '', p.name[1], '', ''],
        { bg: '#16181c', fg: '#e8e3d8', radius: 0.445, font: 0.052 }),
      roughness: 0.38, metalness: 0.6,
    }));
  lip.position.z = zFront;
  g.add(lip);
  // the retaining ring the element sits behind
  const retain = new THREE.Mesh(new THREE.RingGeometry(p.glassR, p.filterR, SEG, 1), chrome);
  retain.position.z = zRetain;
  g.add(retain);
  // the bore behind it, again from the inside
  g.add(cyl(p.glassR, zRetain - 0.0090, zRetain,
    new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.88, side: THREE.BackSide }),
    { open: true }));

  // ---- glass: a real cap, recessed. R from the sag: R = (a² + s²) / 2s ----
  const R = (p.glassR * p.glassR + p.glassSag * p.glassSag) / (2 * p.glassSag);
  const capGeo = new THREE.SphereGeometry(R, SEG, 20, 0, Math.PI * 2, 0, Math.asin(p.glassR / R))
    .rotateX(Math.PI / 2);
  const zGlass = zRetain - 0.0006;                      // the vertex, just behind the retainer
  const cap = new THREE.Mesh(capGeo, glassFront);
  cap.position.z = zGlass - R;
  g.add(cap);
  // the coating flare: one bright ring where the element meets the retaining edge. It is what a
  // coated element looks like from three quarters, and it costs 300 triangles
  const flare = new THREE.Mesh(
    new THREE.TorusGeometry(p.glassR - 0.0007, 0.00045, 8, SEG),
    new THREE.MeshStandardMaterial({ color: 0x2f7fa6, roughness: 0.12, metalness: 1,
      envMapIntensity: 1.1 }));
  flare.position.z = zGlass - p.glassSag * 0.94;
  g.add(flare);
  // the second element, its own cap: smaller radius, flatter, 8mm down the barrel. Scaling the
  // first one would have moved its surface backwards by (1-s)·R and buried it in the core.
  const r2 = p.glassR * 0.76, s2 = p.glassSag * 0.6;
  const R2 = (r2 * r2 + s2 * s2) / (2 * s2);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(R2, 48, 14, 0, Math.PI * 2, 0, Math.asin(r2 / R2)).rotateX(Math.PI / 2),
    glassBack);
  inner.position.z = zGlass - 0.0078 - R2;
  g.add(inner);

  return g;
}
