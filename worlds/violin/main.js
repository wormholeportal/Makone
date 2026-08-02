// violin — a full-size violin lying on its back on the table.
// brief: spruce and flamed maple under old varnish, four strings caught over the bridge
//
// An assembly, not a model: corpus, neck and fittings each came from parts/ and each was reviewed
// alone with `node harness/inspect.mjs violin --part <name>` before it was imported (D7).
//
// It implements no timeline and no tick, and that is the honest answer rather than an omission:
// an unplayed violin does not move. The coordinate it does have is SCALE.vibrating — change that
// one number and the bridge, the f-hole notches and every string move together.
import * as THREE from 'three';
import { createStudio } from '/runtime/studio.js';
import { SCALE, Z, BRIDGE } from './params.js';
import buildCorpus from './parts/corpus.js';
import buildNeck from './parts/neck.js';
import buildFittings from './parts/fittings.js';

export default function createWorld(container) {
  const violin = new THREE.Group();
  violin.name = 'violin';
  violin.add(buildCorpus(), buildNeck(), buildFittings());

  // the body sits at the origin and the neck reaches +z; stand the whole instrument over centre
  violin.position.z = -Z.scroll * 0.30;

  return createStudio(container, violin, { staff: false });
}

export const meta = {
  stringLength: SCALE.vibrating,
  bridgeAt: Z.bridge,
  nutAt: Z.nut,
  curve: BRIDGE.radius,
};
