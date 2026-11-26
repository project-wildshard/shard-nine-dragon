# nine-dragon-budget runs again (opus-chunk2, meta QA 11-25 row 82)

- It reads the eight round-15 dome cameras (art/nine-dragon-stack/round-15-eight-domes/*/cameras.json), which stayed
  in singleplayer in the lean move; they are copied here. nine-dragon-domes and nine-dragon-gpu read them too.
- playwright 1.65.0 is a devDependency: the src/scripts browser tools import it.
- Proof on a local engine build (b9e43a2cd, preview on 127.0.0.1:4391): --totals entered the zone and measured every
  camera (A1·2 aerial over the square: 104 calls, 721k tris).
