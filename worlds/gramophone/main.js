// gramophone — a wind-up talking machine on a grey seamless.
// brief: brass catching a single window's light in a quiet room
//
// This world is an assembly, not a model: every piece comes from parts/, each of which
// was reviewed on its own with `node harness/inspect.mjs gramophone --part <name>`.
// main.js only positions them and turns the platter (D7 supply chain).
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { createStudio } from '/runtime/studio.js';
import { ASSEMBLY, CABINET, TONEARM } from './params.js';
import buildCabinet from './parts/cabinet.js';
import buildTurntable from './parts/turntable.js';
import buildHorn from './parts/horn.js';
import buildTonearm from './parts/tonearm.js';
import buildCrank from './parts/crank.js';

const RPM = 78;

export default async function createWorld(container) {
  await MK.init();                                  // CSG for the rounded case; degrades on its own

  const machine = new THREE.Group();
  machine.name = 'gramophone';

  const top = ASSEMBLY.cabinetTop;
  machine.add(buildCabinet());

  const place = (obj, [x, dy, z]) => { obj.position.set(x, top + dy, z); machine.add(obj); return obj; };
  const turntable = place(buildTurntable(), ASSEMBLY.platterAt);
  place(buildHorn(), ASSEMBLY.hornAt);
  const tonearm = place(buildTonearm(), ASSEMBLY.tonearmAt);

  const crank = buildCrank();
  crank.position.set(...ASSEMBLY.crankAt);
  machine.add(crank);

  // the arm swings in over the record's outer grooves, not parked off the back edge
  tonearm.getObjectByName('arm').rotation.y = TONEARM.swing;

  const platter = turntable.getObjectByName('platter');
  const wind = crank.getObjectByName('wind');

  return createStudio(container, machine, {
    staff: false,                                   // the staff is a review aid, not part of the work
    tick: (dt) => {
      platter.rotation.y += dt * (RPM / 60) * Math.PI * 2;
      wind.rotation.x -= dt * 0.9;
    },
  });
}

export const meta = { cabinetWidth: CABINET.w };    // handy when poking at it from the console
