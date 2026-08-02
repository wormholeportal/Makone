// drone — a folding camera quadcopter, spun up on the ground.
// brief: matte grey composite and carbon, four blades feathered, the gimbal hanging level
//
// An assembly, not a model: body, rotors and gimbal each came from parts/ and each was reviewed
// alone with `node harness/inspect.mjs drone --part <name>` before it was imported (D7).
//
// This file owns two things. One angle spins all four props, and the SIGN comes from the
// handedness table in params — two clockwise, two anticlockwise, which is what cancels a
// quadcopter's yaw. And the gimbal pans: the camera is a child of yaw → roll → pitch, so aiming
// it is three numbers and nothing else in the aircraft moves.
//
// No timeline (D6): rotation is a cycle.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { createStudio } from '/runtime/studio.js';
import { MOTOR, PROP, ARM, GIMBAL } from './params.js';
import buildBody from './parts/body.js';
import buildRotors from './parts/rotors.js';
import buildGimbal from './parts/gimbal.js';

const RPM = 210;                       // idle, on the ground: fast enough to read, slow enough to see
const PAN = 0.22;                      // radians the gimbal sweeps

export default async function createWorld(container) {
  await MK.init();

  const drone = new THREE.Group();
  drone.name = 'drone';
  drone.add(buildBody(), buildRotors(), buildGimbal());

  const props = MOTOR.map((_, i) => drone.getObjectByName(`prop${i}`));
  const yaw = drone.getObjectByName('yaw');
  const pitch = drone.getObjectByName('pitch');

  let t = 0;
  const tick = (dt) => {
    t += dt;
    const a = t * (RPM / 60) * Math.PI * 2;
    props.forEach((p, i) => { p.rotation.y = a * MOTOR[i].spin; });
    // the head sweeps, and the camera stays level while it does — that is what a gimbal is for
    yaw.rotation.y = Math.sin(t * 0.35) * PAN;
    pitch.rotation.x = -0.10 + Math.sin(t * 0.22) * 0.12;
  };
  tick(0);

  return createStudio(container, drone, { staff: false, tick });
}

export const meta = {
  reach: ARM.reach,
  propR: PROP.R,
  motors: MOTOR,
  gimbalHang: GIMBAL.hangY,
};
