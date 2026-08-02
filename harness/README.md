# harness/ — the agent's eyes and hands (deterministic script layer)

All plain Node ESM; the only heavy dependency is Playwright (devDependency, needed only for the agent's closed loop). No long-running process.
**Naming rule: one command = one verb = one responsibility.**

| Script | Responsibility | Key flags |
|---|---|---|
| `serve.mjs` | Zero-dependency static server over the repo root (open / for the gallery) | `--port 5180` |
| `create.mjs` | Scaffold `worlds/<name>/` and refresh the catalog | `--type scene\|game\|object`, `--brief "..."` |
| `capture.mjs` | Headlessly load a world → screenshots for the agent to look at | `--shots N` orbit positions, `--arc a0,a1` limit the angle (walled scenes), `--at t1,t2` timeline positions (0..1), `--after s` simulate s seconds first, `--size WxH`, `--out dir` |
| `verify.mjs` | Load + simulate 5 seconds: console errors, WorldModule contract, tris/drawCalls budget | Outputs JSON, exit 0 on pass |
| `catalog.mjs` | Scan `worlds/*/world.json` → generate `worlds/index.json` | `--check` only validates staleness (CI gate) |
| `smoke.mjs` | End-to-end self-check: create → catalog → verify → capture (both modes) → export, then deletes its throwaway world. **Run it after touching harness/ or runtime/** | 6/6 green, or the loop is broken |
| `lib.mjs` | Shared internal module (start server + chromium + wait for ready + collect console) — **not a command**, hence no verb name | — |

capture/verify drive every world through the same page — that is the point of one contract.

Design notes:
- `capture` is the piece a general coding agent does not have: eyes on what it just wrote;
- the capture page is `/play.html?capture=1` — **humans looking and machines testing go down the same path**: render one frame first
  (the render-once-before-loop axiom), then let the script drive `window.__step` (fixed 30fps stepping, deterministic)
  and `window.__orbit` (orbit positions);
- verifying a terminal state (win/lose etc.) must be done in a freshly opened page with one eval running to completion, never reusing an instance you've already poked (guards against state pollution).
