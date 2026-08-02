// bicycle — a steel road bike, up on the rollers.
// brief: a steel road bike caught mid-lean: thin tubes, gum-wall tyres, 32 spokes drawing hairlines
//
// An assembly, not a model: frame, wheel, drivetrain, cockpit and cables each came from parts/ and
// each was reviewed alone with `node harness/inspect.mjs bicycle --part <name>` before it was
// imported (D7). Every part is built in the bike's own coordinates — rear axle at x = 0, ground at
// y = 0 — so this file adds them at the origin, calls the wheel builder TWICE, and owns one thing:
// the gearing that ties crank speed to chain speed to wheel speed.
//
// No timeline (D6): pedalling is a cycle, so u = 0 and u = 1 are the same frame. The motion lives
// in tick() and the world implements no method it cannot honour.
import * as THREE from 'three';
import { createStudio } from '/runtime/studio.js';
import { P, WHEEL, DRIVE, GEO } from './params.js';
import buildFrame from './parts/frame.js';
import buildWheel from './parts/wheel.js';
import buildDrivetrain from './parts/drivetrain.js';
import buildCockpit from './parts/cockpit.js';
import buildCables from './parts/cables.js';

const CADENCE = 78;                                   // rpm at the cranks — an easy tempo
// One crank turn feeds 52 teeth of chain, and 52 teeth of chain turns the cog 52/17 times. This is
// the whole reason the cranks, the chain and the wheels cannot be given three unrelated speeds and
// left to drift: there is only one number here, and everything else is it times a radius.
const COG_TEETH = Math.round((DRIVE.cogs[5] * 2 * Math.PI) / 0.0127);
const RATIO = DRIVE.chainringTeeth / COG_TEETH;

export default function createWorld(container) {
  const bike = new THREE.Group();
  bike.name = 'bicycle';

  bike.add(buildFrame(), buildDrivetrain(), buildCockpit(), buildCables());

  const rear = buildWheel();
  rear.name = 'wheelrear';
  const front = buildWheel();
  front.name = 'wheelfront';
  front.position.x = GEO.wheelbase;
  bike.add(rear, front);

  // the bike is built from the rear axle forward; stand it over the origin so it sits in frame
  bike.position.x = -GEO.wheelbase / 2;

  const cranks = bike.getObjectByName('cranks');
  const cassette = bike.getObjectByName('cassette');
  const chain = bike.getObjectByName('chain');
  const pedals = [bike.getObjectByName('pedalleft'), bike.getObjectByName('pedalright')];

  let phase = 0;                                      // crank angle, radians
  const drive = (dt) => {
    phase += dt * (CADENCE / 60) * Math.PI * 2;
    cranks.rotation.z = -phase;
    // a pedal hangs level however the crank is turned: cancel the parent's rotation
    for (const p of pedals) p.rotation.z = phase;
    // the chain has no speed of its own — it is the crank angle times the ring's radius. The
    // jockey wheels come along with it, inside advance().
    chain.userData.advance(phase * DRIVE.chainringR);
    rear.rotation.z = -phase * RATIO;
    front.rotation.z = -phase * RATIO;
    cassette.rotation.z = -phase * RATIO;              // it is bolted to the wheel, not the frame
  };
  drive(0);

  return createStudio(container, bike, { staff: false, tick: drive });
}

export const meta = {
  wheelbase: GEO.wheelbase,
  bb: P.bb,
  crown: P.crown,
  ratio: Number(RATIO.toFixed(2)),
  wheelR: WHEEL.R,
};
