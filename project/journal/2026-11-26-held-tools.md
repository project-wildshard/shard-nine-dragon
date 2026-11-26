# Held tools: retire or rewire (opus-held125, meta QA 11-25 row 126)

- `nine-dragon-domes.mjs` is retired: a look-pass capture tool nothing ran (J281: no look rounds unless Jake names
  one), held on engine's `parity/image-routes.mjs` and `canvas-bytes.mjs` (no SDK export) and on round-6 art that
  stayed in singleplayer. `nine-dragon-grapple-touch.mjs` now names `nine-dragon-gpu.mjs` as its sibling slot holder.
- `scripts/blender/targets.json` keeps only `nine-dragon-stack/fp-rig` (the other 42 were the old monorepo's). It
  stays there for now: the installed engine lint finds `viewmodel/rig/check-clips.mjs` as a registered Blender helper
  only through the old place. The move waits on engine's fix reaching the SDK pin (meta QA 11-25 row 129); the
  script-paths baseline holds that one entry.
- `test/nine-authored-manifest.test.ts` builds the pinned engine emitter's monorepo `scripts/` in a temp root; it says
  so with a `script-paths:` marker, so the guard's moved-path check passes it once `scripts/` is gone.
