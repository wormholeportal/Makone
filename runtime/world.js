/* runtime/world.js — the WorldModule contract (source of truth: docs/architecture.md §4 and D6)
 *
 * Every world is one directory under worlds/<name>/:
 *   world.json — intent (type) + north star (brief) + budget. **No capability declarations**
 *   main.js    — export default createWorld(container, opts) => WorldModule
 *
 * Capabilities are not declared, they are machine-probed (D6): implementing seekTo means you have a
 * timeline, implementing act means you're playable. Making the author hand-write something the code
 * already states only creates a chance for the declaration and the fact to disagree.
 * The harness (capture/verify/botplay) and the gallery depend on this contract alone.
 */

/** @typedef {Object} WorldModule
 *  Base (required):
 *  @property {() => import('three').Scene} getScene
 *  @property {() => import('three').Camera} getCamera
 *  @property {() => import('three').WebGLRenderer} getRenderer
 *  @property {() => HTMLCanvasElement} getCanvas
 *  @property {() => object|null} getOrbitControls
 *  @property {() => void} resize
 *  @property {() => void} dispose          release every geometry / material / texture
 *  @property {(dt:number) => void} renderFrame   render one frame; the self-evolving tick is implied
 *
 *  Timeline method family (all or nothing) — time is an addressable coordinate, seekTo on the same t should give the same result:
 *  @property {() => void} [play]
 *  @property {() => void} [pause]
 *  @property {(t:number) => void} [seekTo]
 *  @property {() => number} [getProgress]  0..1
 *  @property {number} [duration]           seconds
 *
 *  Playable method family (all or nothing) — bot-drivable is a hard requirement:
 *  @property {() => object} [getState]     serializable, includes win/lose / terminal state
 *  @property {(input:object) => void} [act]
 *  @property {() => object} [observe]      compact observation from the bot's point of view
 *
 *  Implementing this family is a CLAIM, and the claim is checked from outside: a playable world
 *  owes a `worlds/<name>/pilot.js` that flies it using observe/getState/act and nothing else
 *  (`harness/botplay.mjs`). `observe` describes, `act` commands, and only a loop closed between
 *  them from outside proves the two agree — a world's own autopilot shares its bugs and proves
 *  nothing. `gorge` shipped an inverted yaw sign and a completely inert `act()` behind a green
 *  `interactive: true`; both fell out of the first pilot run (docs/principles.md E11).
 *  Corollary: if both `act` and a keyboard write one input struct, decide which wins on purpose.
 */

/** Load one world directory (shared by the gallery and the harness). */
export async function loadWorld(dir, container, opts = {}) {
  const meta = await (await fetch(`${dir}/world.json`)).json();
  const mod = await import(`${dir}/${meta.entry || 'main.js'}`);
  const world = await mod.default(container, { ...meta, ...opts });   // createWorld may be async
  assertContract(world);
  return { meta, world };
}

const BASE = ['getScene', 'getCamera', 'getRenderer', 'getCanvas', 'resize', 'dispose', 'renderFrame'];
const FAMILIES = {
  timeline: ['play', 'pause', 'seekTo', 'getProgress', 'duration'],
  playable: ['getState', 'act', 'observe'],
};

/** Contract check. The base must be complete; an optional method family must be **all or nothing** —
 *  half a timeline (seekTo but no getProgress) is worse than no timeline: capture will shoot along the timeline and break halfway.
 *  Nothing "declared" is validated here anymore — there is nothing left to declare (D6). */
export function assertContract(w) {
  const missing = BASE.filter((k) => typeof w[k] !== 'function');
  if (missing.length) throw new Error(`WorldModule contract missing: ${missing.join(', ')}`);
  for (const [family, keys] of Object.entries(FAMILIES)) {
    const have = keys.filter((k) => w[k] !== undefined);
    if (have.length && have.length !== keys.length)
      throw new Error(`${family} method family incomplete: have [${have.join(', ')}], `
        + `missing [${keys.filter((k) => w[k] === undefined).join(', ')}]`);
  }
  return true;
}

/** Machine-probed capabilities (D6). The gallery/harness use this to decide how to drive a world. */
export function probeCaps(w) {
  return {
    timeline: typeof w.seekTo === 'function',
    interactive: typeof w.act === 'function',
  };
}
