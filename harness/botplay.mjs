// botplay.mjs — fly a playable world to the end with its own pilot, and report what happened.
//
//   node harness/botplay.mjs <name> [--seconds 240] [--dt 30]
//
// A world that implements `act`/`observe`/`getState` claims to be playable. Nothing checked that
// claim. `verify` reported `interactive: true` from a `typeof` and stopped there, and two bugs
// lived in exactly that gap for a whole build of `gorge`:
//
//   1. every command handed to `act()` was overwritten by the keyboard read on the next frame,
//      so the entire playable contract was implemented and completely inert;
//   2. the yaw sign was inverted — D turned left — and it was invisible because the only thing
//      that ever flew the world was its own autopilot, which derived its command from the same
//      wrong sign. Two mistakes that cancel, and a player who cannot steer.
//
// THE PILOT LIVES OUTSIDE THE WORLD, and that restriction is the entire value of this script.
// `worlds/<name>/pilot.js` may use `observe()`, `getState()` and `act()` and nothing else — no
// imports from the world, no reaching into internals. It is therefore forced to go through the
// same published mapping a player's keyboard goes through: `observe()` describes ("the gate is
// 12 m to your right"), `act()` commands ("turn right"). Close that loop from outside and an
// inverted sign drives you into a wall on the first corner. An autopilot living inside main.js
// writes the internal input struct directly and proves nothing.
//
// The pilot is not a test of skill and should not be clever. It is a test of the interface.
//
//   // worlds/<name>/pilot.js
//   export default function pilot(obs, state, t) { return { turn: ... } }   // may return null
//   export const seconds = 240                          // optional: how long a full run needs
//   export const succeeds = (s) => s.won === true       // optional: what WINNING means here
//
// Exit 0 only when the pilot WINS. "Reached a terminal state" is not the bar — losing is terminal
// too, and the first version of this script happily passed a run where the aircraft never steered,
// missed twenty-two gates and ran out of clock. Only the world knows what a win is, so `succeeds`
// is the world's to declare; the default reads `won` when getState publishes one.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld, worldNameFromArg } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const name = worldNameFromArg(args[0]);
const opt = (flag, dflt) => { const i = args.indexOf(flag); return i > 0 ? Number(args[i + 1]) : dflt; };
const dtHz = opt('--dt', 30);

const pilotPath = path.join(ROOT, 'worlds', name, 'pilot.js');
if (!(await fs.stat(pilotPath).catch(() => null))) {
  console.log(JSON.stringify({ world: name, piloted: false, terminal: false,
    problems: [`worlds/${name}/pilot.js does not exist — nothing can fly this world`] }, null, 2));
  process.exit(1);
}

// A postage stamp on purpose. Headless GL costs about a quarter of a second a frame at 1280×720,
// and a two-hundred-second run is six thousand frames — twenty-five minutes to answer a question
// about game logic. At 256×144 the fill work all but disappears and the same run takes about a
// minute. Nobody looks at these pixels; the world still simulates identically.
const { page, errors, close } = await openWorld(name, { width: 256, height: 144 });

const result = await page.evaluate(async ({ n, hz, secOverride }) => {
  const mod = await import(`/worlds/${n}/pilot.js`);
  const pilot = mod.default;
  if (typeof pilot !== 'function') throw new Error('pilot.js has no default export function');
  const seconds = secOverride || mod.seconds || 240;
  const succeeds = mod.succeeds
    || ((s) => (s.won === undefined ? !!s.terminal : !!s.won));
  const w = window.__world;
  const dt = 1 / hz;
  const frames = Math.round(seconds * hz);

  const first = JSON.stringify(w.getState());
  let acted = 0, changedAt = -1, t = 0;
  for (let i = 0; i < frames; i++) {
    const cmd = pilot(w.observe(), w.getState(), t);
    if (cmd) { w.act(cmd); acted++; }
    w.renderFrame(dt);
    t += dt;
    if (changedAt < 0 && JSON.stringify(w.getState()) !== first) changedAt = i;
    if (w.getState().terminal) break;
  }
  const state = w.getState();
  return { acted, changedAt, seconds: Number(t.toFixed(2)), won: !!succeeds(state), state };
}, { n: name, hz: dtHz, secOverride: opt('--seconds', 0) }).catch((err) => ({ error: String(err) }));

await close();

const problems = [];
if (result.error) problems.push(result.error);
else {
  // The inert-input bug in one line: commands went out and the world never moved.
  if (result.acted > 0 && result.changedAt < 0)
    problems.push('act() was called and getState() never changed — the playable contract is inert');
  if (!result.won)
    problems.push(result.state?.terminal
      ? `the pilot reached a terminal state in ${result.seconds}s but did not win`
      : `the pilot did not finish in ${result.seconds}s`);
}
if (errors.length) problems.push(...errors.map((e) => `console: ${e}`));

console.log(JSON.stringify({
  world: name,
  piloted: true,
  ...result,
  pass: problems.length === 0,
  problems,
}, null, 2));
process.exit(problems.length === 0 ? 0 : 1);
