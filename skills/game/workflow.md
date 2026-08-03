# How to make a game

One north star: **a specific feeling, fully realized.** It reaches the player
through two channels — **it plays well** and **it looks alive** — but those are
how the feeling lands, not the goal itself. A game that plays fine and looks
fine but isn't *about* anything is the failure mode this whole repo keeps
hitting. Don't aim at "a good game." Aim at making one feeling land.

There is no gate to pass and no required order of documents — this page is how
to keep the feeling in view from concept to ending. If your judgment says a
step here would hurt the game, skip it.

## Where you stop and co-create with the human

You (the AI) drive: you run the process, do the heavy lifting, make most calls.
But at three high-leverage forks, **stop and bring the human in** — because
these are exactly the judgments a model fakes confidently and gets subtly
wrong. This is not bureaucracy; it's where soul enters. Don't skip them, and
don't reduce them to rubber-stamps — bring a real proposal and a real question.

- **Fork 1 — the feeling (before any code).** Don't silently pick one concept
  and run. Generate **several distinct seeds** (see Step 1), each a one-line
  feeling + the verb that embodies it + the one arresting frame. Show them to
  the human and let them pick the one with a pulse. Picking the seed is the
  single highest-leverage decision in the whole game; it's worth 30 seconds of
  the human's taste. Just ask — in whatever way your harness asks things.
- **Fork 2 — the look (once the verb is proven fun).** When you have a playable
  slice, lock the art direction *with* the human by **asking them for two or
  three reference frames** — a screenshot of a game with the right mood, a photo,
  a painting. Ask explicitly; humans rarely volunteer them. Then shoot your own
  world with `capture` and put the two side by side. A pasted screenshot corrects
  a wrong art direction faster than any amount of description.
  **A reference is a quality BAR, not a template.** What you take from it is the
  standard — typographic discipline, light contrast, material precision,
  information hierarchy — and what you owe back is your own version of it.
  `gorge` came back from this fork having reproduced a racing game's actual
  layout (card list, paired brand colours, corner dials) and the human's word
  for that was *抄袭*. Write down three or four things the reference does well,
  then reach them with a different design language. The rebuild went the other
  way on every axis — hairlines instead of cards, one accent, one upright
  monospace, a course strip instead of dials — and read as considered instead of
  borrowed.
- **Fork 3 — the ending (before you call it done).** The last 10 seconds are
  where a feeling either lands or evaporates. Show the human the ending beat
  (capture it, or describe it) and ask one question: *did it land?* If the
  ending is just "you win, score: 500", the feeling didn't land — fix it.

## 1. Find the feeling — and offer a few (Fork 1)

Before geometry, do `fantasy-test.md`: find a **feeling worth being
obsessive about**, and a **core verb that IS that feeling** (not a generic verb
with the feeling painted on). For a fresh game, don't commit to one alone —
sketch **3–5 seeds**, each:

- **The feeling** — one phrase ("the ache of an unfinished promise").
- **The verb that embodies it** — one sentence ("walk on as your heart winds
  down"). The verb must carry the feeling when stripped naked.
- **The one arresting frame** — a specific image you can see.

Then take them to the human (Fork 1). Build the one they pick. A seed whose
verb is generic, or whose feeling you can't name in a phrase, is a tech demo —
don't offer it.

> Quality bar for *aliveness*: a characterful hero, hand-picked light, and idle
> motion running even when the player does nothing. Quality bar for *soul*: around
> 500 lines, one feeling, and a verb that carries it. Aim at both.

## 2. Make the verb carry the feeling, and find the one decision

Two things must be true of the core loop:

- **The verb embodies the feeling.** If the feeling is "winding-down time
  pressure," the verb literally winds down (clockheart's clock). If you find
  yourself adding the feeling only through story text or palette while the verb
  stays generic, stop — the feeling is a costume. Rework the verb.
- **There's a real decision every few seconds.** `DO X or DO Y, where X costs A
  and Y costs B`. ❌ "walk right." ✅ "spend a winding-key now or risk reaching
  the next one before the clock dies." The best decisions are *also* expressions
  of the feeling — clockheart's "do I have time?" tension IS the ache.

Strip the visuals in your head: is the bare decision still something you'd want
to make, and does it still feel like the feeling? If no, fix the design, not
the art.

When the genre is recognizable, skim the matching
[`skills/game/playbooks/`](playbooks/SKILL.md) profile for conventions and
death traps. Use it to narrow scope, not as a template.

## 3. Build a playable slice — prove the verb first

Build the smallest thing that lets you *feel the verb*: move / update / state,
plus a rough version of the hero and the world's mood. Drive it via
`getState`/`act` to confirm the core verb actually works and is
satisfying — before pouring time into art. Grey-ish boxes are OK here, but rough
in the palette and one mood-setting light early; a fully grey box hides the
visual problems that sank past games.

Then, with the verb proven fun, do **Fork 2**: lock the art direction with the
human by asking them for reference frames, and close the gap to those frames
with `capture`.

A `<game>.design.md` next to your code holds the feeling / verb / frame /
ending from Step 0. It's a compass, not a deliverable to be graded.

## 3b. Write the pilot, and let it fly the thing

The moment `act`/`observe`/`getState` exist, write `worlds/<name>/pilot.js` and
run `node harness/botplay.mjs <name>`. It is ten lines: read `observe()`, aim,
return a command. **It may not import from your world** — that restriction is
the entire value (docs/principles.md E11).

This is not a test of the game's difficulty, it is a test of the interface, and
it is the cheapest bug-finder in the repo. `gorge` was flown for an entire build
by its own internal autopilot and shipped two invisible bugs: `act()` being
overwritten by the keyboard read on the next frame (the playable contract
implemented and completely inert), and an inverted yaw sign that made `D` turn
left. The first pilot run found both, and the second one answered a design
question nobody had asked yet — a clean run finished with eighty seconds still
on the clock, so the whole time economy was retuned.

A pilot that finishes the course also tells you the game is *completable*, which
is otherwise something you only ever assume.

## 4. Capture, look, fix — close the gap to the feeling

The actual work. After every meaningful build:

1. **`node harness/capture.mjs <world>`** and *look.* Never ship a frame you haven't seen.
2. Ask first: **does this frame feel like the feeling?** Then name the single
   worst thing dragging it away from that. Usually one of:
   - lighting is flat / grey (→ [`craft/narrative-light.md`](../craft/narrative-light.md))
   - materials are default-grey (→ [`craft/color-grammar.md`](../craft/color-grammar.md))
   - the hero reads as a blob (→ more mesh pieces, a face; [`silhouette.md`](../craft/silhouette.md))
   - the world is dead/static (→ idle sway, particles; [`craft/animation.md`](../craft/animation.md))
   - the verb feels mushy (→ [`feel/juicing.md`](feel/juicing.md), feedback < 100ms)
3. Fix that one thing. Capture again. Repeat until it both *plays well* and
   *feels like the feeling.*

Play it too: does the first 30 seconds teach the loop with zero text? Does the
verb feel good in the hand?

## 5. Subtract, polish, and land the ending

- **Subtract.** Anything — mechanic, set-piece, effect — that's fine on its own
  but dilutes the feeling: cut it. A work is as much what you removed as what
  you built.
- **Polish** what remains: post-FX, sky, audio, set dressing, the second-order
  interactions you discovered while playing. Keep capturing and playing; polish
  must never break readability or feel.
- **Land the ending (Fork 3).** Build the last 10 seconds deliberately — that's
  where the feeling resolves. Show the human, ask if it landed.

---

## How a game is actually built (the project shape)

A game is a **world that implements `getState`/`act`/`observe`** — same directory shape, same
contract as every other world (`runtime/world.js`), plus the game methods:

```
worlds/<name>/
  world.json     { "name": "...", "type": "game", "entry": "main.js", "brief": "..." }
  main.js        export default function createWorld(container) { ... }
```

- `createWorld(container)` returns the WorldModule. `renderFrame(dt)` IS your
  game loop body — the player page owns `requestAnimationFrame` and calls it;
  you never write your own rAF (that's what makes headless capture and bot
  play deterministic).
- The game cap requires three methods, and they are **the point**:
  `getState()` (serializable, includes win/lose/terminal state),
  `act(input)` (inject input at key/command level), `observe()` (compact bot
  view). They make the game **playtestable by a bot** — how you prove the
  core verb works before any art. Wire keyboard events to the same code path
  as `act()`: one input path, human and bot identical.
- **Single file until it hurts** (docs/principles.md): keep it all in `main.js`
  up to ~1500 lines; split into modules only past the cliff or with 3+ modes.
- **Build a playable slice first** (move/update/state, rough mood in), confirm
  the verb is fun via `harness/capture.mjs --after` sequences, *then* do the
  art passes. Pure code only — no imported 3D assets. The *feeling* dictates
  the palette — don't default to bright if the feeling is dusk.

## What the lib and the encyclopedia are for

- **`src/game/lib/`** — implementation primitives (core/feel/resources/postfx/
  sky/lighting). Tools to *build* a designed game faster. They can't supply a
  missing feeling, but `lighting/`, `postfx/`, `sky/` are exactly what you reach
  for in step 4 when the render looks dead.
- **`skills/game/00-09/`** — a reference encyclopedia. Cite the page that
  solves the problem in front of you; don't read it cover-to-cover before
  starting.
- **`skills/game/playbooks/`** — one genre's conventions and traps, on demand.

The whole thing in one line: **find a feeling → make the verb carry it →
prove it's fun → close the visual gap → subtract and land the ending** — and
stop at the three forks to bring the human's taste in. No checklist, no audit —
just keep asking "does this feel like the feeling," and keep playing it.
