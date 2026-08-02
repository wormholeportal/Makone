// typewriter — a 1930s portable, mid-sentence.
// brief: cold nickel and black lacquer, a sheet already curled over the platen
//
// An assembly, not a model: every piece comes from parts/, each reviewed on its own with
// `node harness/inspect.mjs typewriter --part <name>` before it was imported here (D7).
// Because every part is built in the machine's floor coordinates (see params.js ASSEMBLY),
// main.js adds them all at the origin and spends its lines on the one thing it owns: time.
//
// Time is a coordinate here (D6): one line of typing is a cycle, so this world implements the
// timeline family and `capture` samples it at 0 / 0.5 / 0.9 without being told to.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { createStudio } from '/runtime/studio.js';
import { KEYBOARD, CARRIAGE, PLATEN, TYPE_POINT, PAPER_FEED_DIR } from './params.js';
import buildFrame from './parts/frame.js';
import buildKeyboard from './parts/keyboard.js';
import buildCarriage from './parts/carriage.js';
import buildTypebars from './parts/typebars.js';
import buildPaper from './parts/paper.js';

const LINE_CHARS = 32;              // characters typed before the carriage is thrown back
const RETURN_BEATS = 2.6;           // the return costs this many character-beats
const BEAT = 0.30;                  // seconds per character — about 40 words a minute
const LINES = 3;                    // lines in one cycle of the timeline
const LINE_BEATS = LINE_CHARS + RETURN_BEATS;
const TOTAL_BEATS = LINES * LINE_BEATS;
const DURATION = TOTAL_BEATS * BEAT;
const LINE_FEED = 0.0042;           // metres of paper per line...
const FEED_ANGLE = LINE_FEED / CARRIAGE.platenR;   // ...as roller rotation
const MAX_FEED = 0.030;             // how far the sheet is allowed to climb before it stops
                                    //   rising: without a cap a long play session feeds the
                                    //   paper off the top of the machine

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** One key-strike, as a function of the fraction through its beat: up fast, held for the
 *  contact, back down slower. The hold is what makes it read as a hit rather than a wave. */
const strikeCurve = (f) => (f < 0.26 ? f / 0.26
  : f < 0.38 ? 1
    : f < 0.70 ? 1 - (f - 0.38) / 0.32
      : 0);

export default async function createWorld(container) {
  await MK.init();                  // CSG for the shell; degrades on its own if the wasm is absent

  const machine = new THREE.Group();
  machine.name = 'typewriter';
  machine.add(buildFrame());

  const keyboard = buildKeyboard();
  const carriage = buildCarriage();
  const basket = buildTypebars();
  machine.add(keyboard, carriage, basket);

  // The sheet travels with the carriage, but it does NOT turn with the roller: a rigid sheet
  // cannot feed through a machine, so the line feed is told by the roller and the knobs turning
  // while the paper holds its place. It is a cheat, and it is the one the paper hides.
  carriage.add(buildPaper());

  const platen = carriage.getObjectByName('platen');
  const vibrator = basket.getObjectByName('vibrator');
  const returnLever = carriage.getObjectByName('returnlever');
  const spools = [basket.getObjectByName('spoolleft'), basket.getObjectByName('spoolright')];
  const keys = keyboard.userData.keys;
  const bars = basket.userData.bars;
  const setBar = basket.userData.setBar;

  const freeEnd = machine.getObjectByName('freeend');
  const freeRest = freeEnd.position.clone();

  const step = CARRIAGE.travel / LINE_CHARS;
  const vibratorRest = vibrator.position.y;
  const keyRest = keys.map((k) => k.position.y);
  let cycles = 0;                   // completed cycles — kept out of `state` so seekTo stays pure

  /** The whole machine as a function of one number. renderFrame and seekTo both go through here,
   *  so a scrubbed frame and a played frame can never disagree.
   *
   *  A cycle is LINES lines, each ending in a carriage return, and the sheet feeds up a line at
   *  every return. That last part is not decoration: with a single line the timeline's two ends
   *  were the same frame, and `verify` failed the world for it (a timeline whose endpoints match
   *  is a timeline you cannot see). The sheet climbing 4.2mm a line is what makes u a coordinate. */
  function state(u) {
    const beats = u * TOTAL_BEATS;
    const line = Math.min(LINES - 1, Math.floor(beats / LINE_BEATS));
    const inLine = beats - line * LINE_BEATS;
    const typing = inLine < LINE_CHARS;
    const char = typing ? Math.floor(inLine) : LINE_CHARS;
    const frac = typing ? inLine - char : 0;
    const hit = typing ? strikeCurve(frac) : 0;
    const glyph = line * LINE_CHARS + char;

    for (let i = 0; i < bars.length; i++) setBar(i, 0);
    for (let i = 0; i < keys.length; i++) keys[i].position.y = keyRest[i];

    if (typing) {
      setBar((glyph * 7 + 3) % bars.length, hit);
      const k = (glyph * 13 + 5) % keys.length;
      keys[k].position.y = keyRest[k] - KEYBOARD.travel * hit;
    }

    // the ribbon is lifted in front of the type point on every strike, and drops back after
    vibrator.position.y = vibratorRest + 0.005 * hit;

    // carriage: one letter-space per beat, the step landing just after the strike
    const advanced = typing ? char + smoothstep(0.34, 0.58, frac) : LINE_CHARS;
    let x = CARRIAGE.travel / 2 - advanced * step;
    let fed = line;                              // lines of paper fed so far this cycle
    let lever = 0;
    if (!typing) {
      const rb = (inLine - LINE_CHARS) / RETURN_BEATS;
      x = -CARRIAGE.travel / 2 + CARRIAGE.travel * smoothstep(0.12, 0.86, rb);
      fed = line + smoothstep(0.05, 0.55, rb);   // the roller turns as the lever is thrown
      lever = Math.sin(Math.PI * smoothstep(0, 0.9, rb)) * 0.5;
    }
    carriage.position.x = x;
    returnLever.rotation.z = lever;

    const totalFed = cycles * LINES + fed;
    platen.rotation.x = -FEED_ANGLE * totalFed;
    const climb = Math.min(MAX_FEED, LINE_FEED * totalFed);
    freeEnd.position.set(freeRest.x,
      freeRest.y + PAPER_FEED_DIR.y * climb,
      freeRest.z + PAPER_FEED_DIR.z * climb);

    // spools creep round as the ribbon winds on — a sixth of a turn a line, small and correct
    const wind = totalFed * (Math.PI / 3);
    spools[0].rotation.y = wind;
    spools[1].rotation.y = -wind;
  }

  let clock = 0;
  let running = true;
  state(0);

  const studio = createStudio(container, machine, {
    staff: false,                                   // the staff is a review aid, not part of the work
    tick: (dt) => {
      if (!running) return;
      clock += dt;
      while (clock >= DURATION) { clock -= DURATION; cycles++; }
      state(clock / DURATION);
    },
  });

  return {
    ...studio,
    // timeline family — all five, or capture will shoot along a timeline that is not there
    play: () => { running = true; },
    pause: () => { running = false; },
    seekTo: (u) => {
      cycles = 0;
      clock = Math.min(Math.max(u, 0), 1) * DURATION;
      state(clock / DURATION);
    },
    getProgress: () => clock / DURATION,
    duration: DURATION,
  };
}

export const meta = { typePoint: TYPE_POINT, platen: PLATEN, duration: DURATION };
