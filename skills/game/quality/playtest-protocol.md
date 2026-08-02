# Playtest Protocol

AI cannot feel boredom. It needs hard probes.

Run this three times: after design doc, after MVP, after polish.

## Solo Agent Test

1. Start preview and `node harness/capture.mjs <world>`.
2. Inspect the first frame:
   - Can danger/goal/player be named in 1 second?
   - Is the first interaction visible without text?
   - Did bloom/fog/particles hide gameplay?
   - Does the world look *alive* — light, palette, motion — or grey and static?
3. Play for 90 seconds.
4. Note three things (in the design scratchpad, or just out loud):
   - first confusing moment,
   - first fun moment,
   - first reason to retry.
5. Fix the single worst thing you found, then re-run this test.

## Stranger Test

Give no explanation. Watch a player for 3 minutes.

Record:

| Signal | Good | Bad |
|---|---|---|
| Time to first meaningful input | < 5s | > 10s or asks what to do |
| Time to first smile / tension / "oh" | < 30s | never |
| First death reaction | "again" | silence / tab close |
| Spectator reaction | wants to try | politely watches |

## Cut Rules

- If a feature does not improve a proof in `fun-compiler.md`, cut it.
- If a visual effect makes screenshots better but play less readable, cut it.
- If a mechanic cannot be taught in the first 30 seconds or introduced by
  progressive disclosure, defer it.
- If balance requires guessing across many content items, write a simulator or
  reduce item count.

## Ship Threshold

Do not call it playable until:

- the fantasy still holds up when you say it out loud (`game/fantasy-test.md`),
- no visual-performance budget is exceeded without a design-doc reason,
- first 90 seconds contain one "oh no" and one "yes" beat,
- restart friction is under 3 seconds.
