// camera — a 35mm SLR on the table, being wound on.
// brief: cold chrome and grained leather, the lens front element holding one blue reflection
//
// An assembly, not a model: body, prism, lens and controls each came from parts/ and each was
// reviewed alone with `node harness/inspect.mjs camera --part <name>` before it was imported (D7).
// Every part is built in the camera's own floor coordinates, so this file adds them at the origin
// and spends its lines on the one thing it owns: the advance stroke.
//
// It does NOT implement a timeline, and that is a finding rather than an omission: the wind
// stroke is a CYCLE, so u=0 and u=1 are the same frame, and `verify` says so —
//   "timeline: seekTo(0) and seekTo(1) render the same frame (motion 0.0000)".
// A camera being wound has a phase, not a coordinate. So the stroke lives in tick() and the world
// implements no method it cannot honour (D6).
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { createStudio } from '/runtime/studio.js';
import { CONTROLS, LENS, MOUNT, BODY } from './params.js';
import buildBody from './parts/body.js';
import buildPrism from './parts/prism.js';
import buildLens from './parts/lens.js';
import buildControls from './parts/controls.js';

const DURATION = 3.2;                 // one frame: release, wind, settle
const FRAMES = 12;                    // numbers on the counter disc — one cycle advances one
const rad = (d) => (d * Math.PI) / 180;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default async function createWorld(container) {
  await MK.init();                    // rounded boxes; degrades to plain ones on its own

  const camera = new THREE.Group();
  camera.name = 'camera';
  camera.add(buildBody(), buildPrism(), buildLens(), buildControls());

  const lever = camera.getObjectByName('windlever');
  const button = camera.getObjectByName('shutterbutton');
  const counter = camera.getObjectByName('counterdial');
  const focus = camera.getObjectByName('focusring');
  const aperture = camera.getObjectByName('aperturering');

  const buttonRest = button.position.y;
  let frames = 0;                     // completed cycles — kept out of state() so seekTo stays pure

  /** The whole machine as a function of one number, so a scrubbed frame and a played frame can
   *  never disagree. The order is the real one: the button goes down first, and only then does
   *  the lever have anything to wind. */
  function state(u) {
    // 0.00–0.14  release pressed        0.20–0.62  lever out       0.62–0.92  lever back
    const press = u < 0.14 ? Math.sin((u / 0.14) * Math.PI) : 0;
    const out = smoothstep(0.20, 0.62, u);
    const back = smoothstep(0.62, 0.92, u);
    const swing = out - back;                       // 0 → 1 → 0 over the stroke

    button.position.y = buttonRest - CONTROLS.buttonH * 0.42 * press;
    lever.rotation.y = -rad(CONTROLS.windRest + CONTROLS.windThrow * swing);

    // the counter creeps round with the wind, and stays where the stroke left it
    counter.rotation.y = -((frames + out) * Math.PI * 2) / FRAMES;

    // the focus ring drifts a few degrees over the cycle — a hand resting on it, not a motor
    focus.rotation.z = rad(9) * Math.sin(u * Math.PI * 2);
    aperture.rotation.z = rad(3.5) * swing;
  }

  let clock = 0;
  let running = true;
  state(0);

  const studio = createStudio(container, camera, {
    staff: false,                                   // the staff is a review aid, not part of the work
    tick: (dt) => {
      if (!running) return;
      clock += dt;
      while (clock >= DURATION) { clock -= DURATION; frames++; }
      state(clock / DURATION);
    },
  });

  return studio;
}

export const meta = {
  axis: MOUNT.axisY,
  overall: { w: BODY.w, h: BODY.h, d: BODY.d + LENS.length + MOUNT.flangeT },
  duration: DURATION,
};
