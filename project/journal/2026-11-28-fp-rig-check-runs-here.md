# 2026-11-28: the fp-rig check runs in this repo

- Meta QA 11-25 row 157 (from row 132). The manual `nine-dragon-stack/fp-rig` target's `check-clips.mjs` climbed six
  folders to the old monorepo root and loaded `src/client/game/systems/viewmodel/armRig.ts` there; the lab's `moves.ts`
  also needs `settleLeft`, which the engine dropped from `armRig.ts` as unused (singleplayer `be8f1ba7e6`).
- Now the check roots at this repo, reads the installed SDK's `armRig.ts` (the engine module through
  `@wildshard/sdk/headless`), and writes a small `rig.ts` beside the recovered `moves.ts`: the SDK's rig plus the
  lab's `settleLeft`, verbatim. Its scratch goes to `tmp/` and is removed on exit. All 16 clips pass, worst 0.031°.
- `scripts/blender/targets.json` named the outputs under `src/static/assets/nine-dragon/`, a folder this repo doesn't
  have; they live under `nine-dragon-stack/`. The SDK's `check-model-sources.mjs` now passes.
- Guard: `test/nine-blender-targets.test.ts` runs both, so neither can drift away again.
