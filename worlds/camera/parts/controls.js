// controls — everything the right hand touches: advance lever, speed dial, release button,
// frame counter, and the rewind knob at the other end.
// Datum: mounted. Built on the top plate in the camera's floor coordinates.
// Pivots: `windlever` (rotation.y), `counterdial` (rotation.y), `rewindknob`, `timerlever`.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { CONTROLS, BODY, MOUNT, PALETTE } from '../params.js';
import { knurlGeo, dialTexture } from '/runtime/forms.js';

export const params = CONTROLS;
export const datum = 'mounted';

const rad = (d) => (d * Math.PI) / 180;

export const inventory = [
  `advance lever ${params.windLen * 1000}mm long, parked at ${params.windRest}° along the back edge, `
    + `${params.windThrow}° of throw — a named pivot, so the assembly can wind it`,
  `speed dial ø${params.dialR * 2000}mm with ${params.speeds.length} engraved speeds `
    + `(${params.speeds[0]}–${params.speeds[params.speeds.length - 1]}) and a fluted rim`,
  `release button ø${params.buttonR * 2000}mm, sunk in a collar with a cable-release thread`,
  'frame counter: a numbered disc under a SOLID cover with one number\'s worth of window in it, '
    + 'clear of the speed dial (asserted) — a counter shows one frame, not twelve',
  `every grip on the plate knurled by pitch (${params.knurlPitch * 1000}mm), not by tooth count, `
    + 'so a ø20 dial and a ø14 hub come out of the same rule',
  `rewind knob ø${params.rewindR * 2000}mm at x = ${params.rewindX * 1000}mm with a fold-out crank`,
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'controls';
  const topY = BODY.h;

  const chrome = new THREE.MeshStandardMaterial({ color: PALETTE.chrome, roughness: 0.18, metalness: 0.95 });
  const bright = new THREE.MeshStandardMaterial({ color: PALETTE.chromeBright, roughness: 0.10, metalness: 0.97 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.black, roughness: 0.5, metalness: 0.3 });

  /** A knurled knob: a solid core with a knurl band round it, standing on y = 0 and rising to h.
   *  The band is a ring — it has a bore — so the core is what closes the top and the bottom; a
   *  knurl on its own is a tube you can see straight through. The band is inset at both ends so
   *  the core shows as a turned edge, which is also what keeps their caps off each other's plane.
   *  Grips are specified by PITCH here for the same reason as the lens: a tooth count that looks
   *  right on a ø20 dial is a sprocket on a ø64 ring, and both were wrong the first time. */
  const knurledKnob = (r, h, mat, { pitch = p.knurlPitch, depth = p.knurlDepth, inset = 0.0005 } = {}) => {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r - depth, r - depth, h, 48), mat);
    core.position.y = h / 2;
    core.castShadow = core.receiveShadow = true;
    const band = new THREE.Mesh(
      knurlGeo(r, h - inset * 2, { pitch, depth, bore: r - depth * 3.2 }), mat);
    band.position.y = h / 2;
    band.castShadow = true;
    grp.add(core, band);
    return grp;
  };

  // ---- advance lever ----
  const lever = new THREE.Group();
  lever.name = 'windlever';
  lever.position.set(p.windPivotX, topY, p.windPivotZ);
  lever.rotation.y = -rad(p.windRest);            // +x in local space, swung to the parked angle
  // The hub is a low COLLAR, not a knob. At ø18 and 6.6mm tall it stood as high and as wide as
  // the speed dial 4mm away, and the two read as a matched pair of knobs instead of a dial with
  // a lever pivoting beside it. A lever's hub is the thing it turns on; the eye should not
  // count it twice.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.0080, 0.0086, 0.0032, 32), chrome);
  hub.position.y = 0.0016;
  hub.castShadow = true;
  lever.add(hub);
  const hubTop = knurledKnob(0.0068, 0.0022, bright, { inset: 0.0004 });
  hubTop.position.y = 0.0030;
  lever.add(hubTop);
  // the arm: tapered, and it steps UP over the hub before running out flat
  const arm = new THREE.Mesh(MK.rbGeo(p.windLen * 0.78, p.windThick, 0.0068, 0.0011), chrome);
  arm.position.set(p.windLen * 0.44, 0.0046, 0);
  arm.castShadow = true;
  lever.add(arm);
  const tip = new THREE.Mesh(MK.rbGeo(0.0110, p.windThick + 0.0012, 0.0090, 0.0022), dark);
  tip.position.set(p.windLen - 0.0050, 0.0049, 0);
  tip.castShadow = true;
  lever.add(tip);
  g.add(lever);

  // ---- shutter speed dial ----
  const dial = new THREE.Group();
  dial.name = 'shutterdial';
  dial.position.set(p.dialX, topY, p.windPivotZ);
  dial.add(knurledKnob(p.dialR, p.dialH, chrome, { pitch: 0.00145, depth: 0.00055 }));
  const face = new THREE.Mesh(new THREE.CircleGeometry(p.dialR - 0.0011, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      map: dialTexture(p.speeds, { accentAt: p.speeds.length - 3 }), roughness: 0.3, metalness: 0.6,
    }));
  face.position.y = p.dialH + 0.0001;
  dial.add(face);
  const pip = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0016, 0.0032), bright);
  pip.position.set(p.dialX, topY + 0.0008, p.windPivotZ + p.dialR + 0.0018);
  g.add(dial, pip);

  // ---- release button, in its collar ----
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(p.buttonR + 0.0020, p.buttonR + 0.0024, 0.0026, 24), chrome);
  collar.position.set(p.buttonX, topY + 0.0013, p.windPivotZ + 0.0125);
  g.add(collar);
  const button = new THREE.Group();
  button.name = 'shutterbutton';
  button.position.set(p.buttonX, topY + 0.0026, p.windPivotZ + 0.0125);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(p.buttonR, p.buttonR, p.buttonH, 22), bright);
  cap.position.y = p.buttonH / 2;
  button.add(cap);
  const thread = new THREE.Mesh(
    new THREE.CylinderGeometry(p.buttonR * 0.52, p.buttonR * 0.52, p.buttonH * 0.6, 16), dark);
  thread.position.y = p.buttonH * 0.75;
  button.add(thread);
  g.add(button);

  // ---- frame counter: a disc that turns under a window ----
  const window_ = new THREE.Mesh(
    new THREE.CylinderGeometry(p.counterR, p.counterR, 0.0012, 32), dark);
  window_.position.set(p.counterX, topY + 0.0002, p.counterZ);
  g.add(window_);
  const counter = new THREE.Group();
  counter.name = 'counterdial';
  counter.position.set(p.counterX, topY + 0.0009, p.counterZ);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(p.counterR - 0.0006, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      map: dialTexture(['S', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
        { bg: '#1a1c20', fg: '#e8e3d8', accentAt: 0, radius: 0.375, font: 0.115 }),
      roughness: 0.55,
    }));
  counter.add(disc);
  g.add(counter);
  // the cover that hides all of the disc but one number
  const mask = new THREE.Mesh(cutSlot(p.counterR + 0.0009, p.counterR * 0.58, p.counterR * 0.94), chrome);
  mask.position.set(p.counterX, topY + 0.0015, p.counterZ);
  g.add(mask);

  // ---- rewind knob and its crank ----
  const rewind = new THREE.Group();
  rewind.name = 'rewindknob';
  rewind.position.set(p.rewindX, topY, p.windPivotZ + 0.0010);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0058, 0.0055, 20), chrome);
  stem.position.y = 0.0027;
  rewind.add(stem);
  const knob = knurledKnob(p.rewindR, p.rewindH, chrome, { pitch: 0.00145, depth: 0.00055 });
  knob.position.y = 0.0055;
  rewind.add(knob);
  const crank = new THREE.Mesh(MK.rbGeo(0.0125, 0.0016, 0.0032, 0.0007), bright);
  crank.position.set(0.0042, 0.0055 + p.rewindH + 0.0012, 0);
  crank.rotation.z = 0.10;
  rewind.add(crank);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0042, 12), dark);
  grip.position.set(0.0098, 0.0055 + p.rewindH + 0.0030, 0);
  rewind.add(grip);
  g.add(rewind);

  // ---- self-timer lever, on the front plate ----
  const timer = new THREE.Group();
  timer.name = 'timerlever';
  timer.position.set(-MOUNT.flangeR - 0.0090, MOUNT.axisY - 0.0035, BODY.d / 2 - 0.0005);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.0030, 20).rotateX(Math.PI / 2),
    chrome);
  timer.add(boss);
  const paddle = new THREE.Mesh(MK.rbGeo(p.timerLen, 0.0055, 0.0026, 0.0010), chrome);
  paddle.position.set(-p.timerLen / 2 + 0.0030, -0.0042, 0.0006);
  paddle.rotation.z = 0.42;
  paddle.castShadow = true;
  timer.add(paddle);
  g.add(timer);

  return g;
}

/** The counter cover: a solid chrome disc with ONE number's worth of window cut out of it.
 *
 *  It was an annulus, and an annulus does not cover a counter — its bore left the whole numbered
 *  ring showing, so the counter read twelve frames at once through what looked like a keyhole.
 *  A frame counter shows one number; the cover has to be solid everywhere else.
 *
 *  The window faces the photographer, and that is a fact about the texture, not a guess:
 *  dialTexture puts label 0 at the canvas top, CircleGeometry's uv v=1 is its +Y, and
 *  rotateX(-90°) sends +Y to -Z — which is the side the camera is held from. So the cut is at
 *  +90°, where label 0 lands, not at -90°, which is the lens's side. */
function cutSlot(rOuter, rWinInner, rWinOuter) {
  const gap = 0.44;                                   // radians of opening: one number wide
  const a0 = Math.PI / 2 - gap / 2, a1 = Math.PI / 2 + gap / 2;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const win = new THREE.Path();                       // opposite winding, or it is not a hole
  win.absarc(0, 0, rWinOuter, a1, a0, true);
  win.absarc(0, 0, rWinInner, a0, a1, false);
  shape.holes.push(win);
  return new THREE.ShapeGeometry(shape, 44).rotateX(-Math.PI / 2);
}
