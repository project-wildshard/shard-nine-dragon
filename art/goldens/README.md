# Goldens: nine-dragon-stack

> Written by: Claude (opus-k9, REPO-KIT K9, 2026-11-11). Carried from singleplayer `art/shardfile-goldens/` and
> `art/legacy-goldens/` (`08e4a21f69`). Jake, 2026-11-11 (J273): "goldens has to go into each major shard".

The look to hold for `nine-dragon-stack`: 24 cameras. The skill `goldens` runs them; the rules are engine `docs/goldens.md`.

- `shardfile/<nn>-<camera>.jpg`: the SHARDFILE goldens (G859, G873 L5), 22 px label strip on top.
- `legacy/<nn>-<camera>.jpg`: the frozen LEGACY record (10-28, G843). Never re-captured, never updated.
- `cameras24.json`: this shard's 24 cameras (eye, yaw, pitch, FOV, probe), the `nine-dragon-stack` entry of engine
  `scripts/perf/cameras24.json`.
- `runs/<date>-<sha10>-board.jpg`: the rerun board (<= 500 KB) a look change lands with.

## Source

The clean 144-camera rerun on `744c3ab7e2`, captured 2026-10-29 with the capture now at engine
`scripts/goldens/capture.mjs --mode=shardfile` (muted Chromium, iPhone 16 Pro portrait, phone tier, 2x, seed 357,
midday / clear). Re-encoded at 540 x 915 with a 22 px label strip, JPEG quality 72.

## Updates

- 2026-11-03, nine-dragon-stack 01-08, 14, 19, 23, 24: refreshed for QD3 (G995, ruled B under G941: the wet-ground
  neon streaks sit at each light's own mirror point, only for lights on screen, as a short gloss fading from 15 m to
  nothing at 50 m; board `../nine-dragon-stack/round-51-qd3-streaks/`). Captured on `592dc655ea` + the QD3 change,
  Chromium; WebKit matched. Boards: `../golden-runs/nine-dragon-stack/2026-11-03-592dc655ea-qd3{,-webkit}-board.jpg`.
- 2026-11-03, nine-dragon-stack 17, 18, 21: refreshed for QD1 (`cc40cad706`, `54771bace4`: walls and floors hung under kit
  anchors draw again). The 10-29 goldens showed pale voids on the portal decks and a void under 21's awning; the new frames
  show LEGACY's distant crowns and building columns. Captured on `c71f1f4e53`, Chromium; WebKit matched. Boards:
  `../golden-runs/nine-dragon-stack/2026-11-03-c71f1f4e53-qd1-promote-{chromium,webkit}-board.jpg`.
- 2026-11-04, driftwood-isle 02, 13, 14, 15, 24 and nine-dragon-stack 22: promoted per wildshard-new's ruling (G872) on
  sp-x6's golden-drift bisect (`tmp/sp-x6-golden-bisect/`): Driftwood's foliage, frond and canopy shadows from the G913 palm
  folds (`afddc7b6f9`, `13bbae2567`) and Nine's detailed far facades from NF4's legacy paint restoration (`d6f1822f09`) are
  intended. driftwood-isle 23: its hands were dark from `180df449c9` (the GLSL graph back-end ignored `shadow.offset`);
  with that fixed its hands are bright again, as before, and it is re-taken with the fold changes only. Captured on
  `f437ca63d6` + the shadow-offset fix + DL7 P1, Chromium; WebKit matched. Boards:
  `../golden-runs/<slug>/2026-11-04-f437ca63d6-p1-dw23{,-webkit}-board.jpg`.
- 2026-11-04, far-reach 18 and nine-dragon-stack 13: D228. Far Reach 18's 10-29 golden was captured without the viewmodel
  (LEGACY, `793ceb58` and every later frame draw the fan and hand): golden defect, promoted per wildshard-new's ruling
  (G872). Nine 13 kept the pre-QD3 streaks when QD3 (`4567995448`, G995 B) promoted 12 cameras; the frame now shows the
  intended on-screen-light gloss. Captured on `0bf578e89b`, Chromium. Boards:
  `../golden-runs/{far-reach,nine-dragon-stack}/2026-11-04-0bf578e89b-d228-board.jpg`.

Add one line per promotion: date, cameras, ruling, board path.
