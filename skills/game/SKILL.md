---
name: game
description: Game-specific design - the north star (one feeling, fully realized), the co-creation forks, and the reference library for feel, mechanics, onboarding, narrative, audio, genre playbooks and production quality. Load only when the thing is playable.
---

# game/ — designing something playable

## One north star, two channels. Everything else is your judgment.

We are not trying to make "a game." We are trying to make a **work** — something
that touches the person playing it. A work is what happens when you get obsessed
with **one specific feeling** and chase it to the bone. So the north star is:

> **A specific feeling, fully realized.**

Name the feeling in a phrase ("the last twenty metres, with eleven seconds of
fuel and the shadow of your own craft coming up to meet you" — that is what a
`brief` field should read like), then make the **core verb
BE that feeling**, not a generic verb with the feeling painted on. That is the
difference between a work and a tech demo. Start at
[`fantasy-test.md`](./fantasy-test.md) — it's where most AI games die.

The feeling reaches the player through **two channels** — both required, neither
is the goal by itself:

1. **It looks alive** — a world with mood, characters with personality, light
   that means something. The aliveness bar: characterful models
   (~60 mesh pieces, not 5 spheres), hand-picked palette, fog/light/particles
   that breathe.
2. **It plays well** — a core verb that feels good on its own and *embodies the
   feeling*, plus a decision worth making every few seconds.

Form is a friend here: **pure code, a few hundred lines, one screen-ish of
world.** Like the GameBoy's 4 colors, that constraint forces a style. Aim at the
sweet spot it's great at — short arc, one deep mechanic, strong specific mood, a
few narrative beats that land — not at "a big game" that thins into nothing.
560 lines is enough to land a feeling in twenty seconds.

There is no checklist to pass, no audit gate, no required pipeline. The docs
below are **reference you reach for when stuck**, not a process you march
through. Trust your taste; if a rule here would make the game worse, ignore it.

## Stop and co-create at three forks

You drive. But at three high-leverage forks — exactly the calls a model fakes
confidently and gets subtly wrong — stop and bring the human's taste in (see
[`workflow.md`](./workflow.md)):

1. **The feeling** (before any code): offer a few seeds, let the human pick the
   one with a pulse (`ask_user`).
2. **The look** (once the verb is proven fun): lock art direction together
   (`generate_concept_images` → `request_image_review`).
3. **The ending** (before "done"): show the last 10 seconds, ask if the feeling
   landed.

> Past mistake this replaces: a 21-step workflow + a regex "audit" that scored
> docs on whether they contained the right buzzwords. Games optimized to pass
> the audit and came out as soulless skeletons (qbert, galaga, …). The audit is
> gone. Your eyes are the audit now.

---

## The loop that actually produces quality

Makone's superpower is that **you can see your own render** (`node harness/capture.mjs <world>`).
Use it. This is the spine:

```
name the feeling  →  build a vertical slice  →  CAPTURE & LOOK
        ↑                                              │
        └──── doesn't feel like the feeling / boring ──┘
            (fix the worst thing, capture again)
```

- **Look at every build.** Don't ship a frame you haven't seen. Most of the
  dontstarve gap is just *nobody looked and fixed the ugly*.
- **Ask "does this feel like the feeling?" first, then fix the worst thing.**
  Flat lighting? Grey materials? Character reads as a blob? Static/dead world?
  Off-tone for the feeling? Pick the worst, fix it, look again. Iterate until it
  looks alive, plays well, AND feels like the feeling.
- **Visuals and gameplay are co-equal, both in service of the feeling.** Do NOT
  save all the art for last. A grey box that plays fine is as much a failure
  here as a gorgeous static diorama — and a polished game that isn't *about*
  anything is the failure this repo keeps hitting.

## Before you build: find the feeling (minutes, not gates)

1. **Name the feeling, and offer a few.** Do
   [`fantasy-test.md`](./fantasy-test.md): a feeling worth being
   obsessive about + a core verb that *embodies* it + one arresting frame. For a
   fresh game, sketch **3–5 seeds** and let the human pick (Fork 1, `ask_user`).
   Don't silently commit to one.
2. **Write a one-paragraph bible for the chosen seed** (a creative prompt, not a
   form):
   - **The feeling** — one phrase, and why the core verb *is* that feeling.
   - **Who** is the hero, in one vivid sentence? (personality, not a shape)
   - **Where** — mood, palette, time of day, weather, all serving the feeling.
   - **The ending beat** — what the player feels in the last 10 seconds.

   Keep it loose. The point is to *decide the soul* before geometry, so the build
   has something to aim at.

3. **Visualize the look — AFTER the verb is proven, not before** (Fork 2). The
   trap is leading with concept art: pretty frames make you build a *diorama*
   and skip proving the game is fun. So first build a playable slice and confirm
   the verb carries the feeling. *Then* use `generate_concept_images` to turn the
   chosen feeling into art-direction frames (hero / world / the key emotional
   moment) and `request_image_review` for an art-director critique + the human's
   approval. Approved frames are your **visual target** — `node harness/capture.mjs <world>` while
   building and close the gap. Skip for throwaway prototypes.

Then build the slice, prove the verb, lock the look, capture, close the gap,
subtract, land the ending.

---

# Reference library (open when stuck, don't read front-to-back)

Two layers. The encyclopedia answers **WHY/HOW** (universal craft); the
playbooks answer **WHAT** (one genre's conventions + landmines). Pull the one
page that solves the problem in front of you — citing all of it before
designing is what bloated past attempts.

## Most useful when the render looks dead

Visual craft is not game-specific — it lives in [`skills/craft/`](../craft/SKILL.md).
The pages that pay off fastest on a game:

- [`narrative-light.md`](../craft/narrative-light.md) — light is the strongest mood tool
- [`color-grammar.md`](../craft/color-grammar.md) — hand-pick a palette, kill default grey
- [`silhouette.md`](../craft/silhouette.md) — readable character shapes
- [`palette-families.md`](../craft/palette-families.md)
- [`render-recipes.md`](../craft/render-recipes.md) — render setup by camera type
- [`lighting-budget.md`](../craft/lighting-budget.md) — dynamic light vs emissive vs baked
- [`animation.md`](../craft/animation.md) — make things move alive (idle sway, squash, follow-through)
- [`particle-psychology.md`](../craft/particle-psychology.md)

## Most useful when it plays boring

- [`axioms/core-loop.md`](axioms/core-loop.md) — the core verb must be fun alone
- [`mechanics/interesting-decisions.md`](mechanics/interesting-decisions.md) — a real trade-off every few seconds
- [`mechanics/second-order.md`](mechanics/second-order.md) — simple rules → emergent depth
- [`feel/juicing.md`](feel/juicing.md) — stack feedback channels for crunch
- [`axioms/feedback-latency.md`](axioms/feedback-latency.md)
- [`mechanics/difficulty-arc.md`](mechanics/difficulty-arc.md)
- [`onboarding/first-30s.md`](onboarding/first-30s.md)

## Full index

Three pages sit at this level, in the order you'd hit them:

| page | what it is | open it when |
|---|---|---|
| [`fantasy-test.md`](fantasy-test.md) | Step 0 — find a feeling worth being obsessive about, and the verb that IS it | before any code, on every new game |
| [`workflow.md`](workflow.md) | the whole arc: feeling → slice → capture → subtract → ending, and the three co-creation forks | you're building and want to know what comes next |
| [`design-doc.md`](design-doc.md) | the design-doc template — core decision, trade-offs, first 30s, what's excluded | writing `<game>.design.md` |

Everything else is a subdirectory with its own `SKILL.md` routing *symptom →
page*. Open that first; don't list a directory and guess from filenames.

| dir | what it covers | open it when |
|---|---|---|
| [`axioms/`](axioms/SKILL.md) | the 7 non-negotiables of playability | it "works" but nobody wants a second run |
| [`feel/`](feel/SKILL.md) | juice, hitstop, coyote time, buffering, shake, telegraphing, camera | it's mushy, unfair, or flat to the hand |
| [`mechanics/`](mechanics/SKILL.md) | decisions, risk/reward, economy, rewards, difficulty, motivation | it's smooth and boring |
| [`onboarding/`](onboarding/SKILL.md) | first 30 seconds, progressive disclosure, tutorial types | new players are lost |
| [`narrative/`](narrative/SKILL.md) | environmental storytelling | the world should imply what happened |
| [`audio/`](audio/SKILL.md) | sound as feedback, music tension curves | it looks right and feels cold |
| [`architecture/`](architecture/SKILL.md) | composition, FSM, event bus, save systems | new features keep breaking old ones |
| [`playbooks/`](playbooks/SKILL.md) | 13 genre playbooks + a router | the game maps to a known genre |
| [`quality/`](quality/SKILL.md) | market reality, fun compiler, playtest protocol | pushing from "runs" to "good" |
| [`../craft/`](../craft/SKILL.md) | all visual technique (not game-specific) | the render looks dead |
| [`../three/`](../three/SKILL.md) | three.js API + engine failure modes | "how do I do X in three.js" |

## Genre playbooks (`playbooks/`)

If the game maps to a known genre, the matching `designing-<genre>.md` gives
that genre's conventions, the decisions that define it, and the landmines that
kill it. Read `playbooks/genre-router.md` to triage if the genre is
unclear. Use these to *avoid known traps and narrow scope* — not as templates
to fill in.

---

## Classic sources

These skills distill: *The Art of Game Design* (Schell), *Game Feel* (Swink),
*A Theory of Fun* (Koster), *Rules of Play* (Salen & Zimmerman),
*Game Programming Patterns* (Nystrom), *The Design of Everyday Things* (Norman),
*The Illusion of Life* (Thomas & Johnston), *Color and Light* (Gurney),
*Real-Time Rendering*, plus GDC talks (Meier "Interesting Decisions",
Nijman "Art of Screenshake", Brown's Game Maker's Toolkit) and the psychology
of flow (Csikszentmihalyi), self-determination (Deci & Ryan), and reward
schedules (Skinner). Each doc cites its sources at the foot.
