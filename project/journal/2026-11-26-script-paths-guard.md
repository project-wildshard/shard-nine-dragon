# The push lane runs the script-paths guard (opus-guard119, meta QA 11-25 row 119)

- `.githooks/run-checks.mjs` was row 113's hand-edited copy, which never ran the script-paths, chunk-param or
  gate-report steps. It is the kit's copy again; the only local edit was a dynamic `branch-restore.mjs` import.
- `kit.mjs apply` brought the guard and its helpers, and publish.yml without the pre-lean
  `scripts/select-candidate.mjs` fallback; `agent-sync --from repo-kit` restamped agent-sync.mjs (row 97's wording)
  and the NotebookEdit matcher (row 108).
- Fixed at the cause: nine-dragon-gpu, test-nine-gpu-boot and test-nine-native-startup
  now import the SDK's exported copy (`@wildshard/sdk/headless/scripts/...`).
- goldens-webkit.yml checks out engine and ran its tools at the pre-lean `scripts/` paths (pins.ts, splitOutput,
  capture-inputs, ci-playwright-install, preview-server, capture, board.py); they are `src/scripts/` now, and
  `pnpm build:game` is marked as engine's package script.
- The rest are held in `.githooks/script-paths.baseline.json`, each with why its fix is not this repo's:
  nine-dragon-domes' two engine-internal parity/ imports (no SDK export) and the round-6 art that waits on them.
- `scripts/blender/` stays: the SDK's Blender build reads `./scripts/blender/targets.json` from the repo root, and
  live targets build models here. Its baseline entry says so.
