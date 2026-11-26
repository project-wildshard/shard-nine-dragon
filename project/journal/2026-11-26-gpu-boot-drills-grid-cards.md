# GPU boot drills read the grid boot's cards (opus-nine133, meta QA 11-25 row 133)

- Run against engine `135ebd939` packed, under `wildshard dev`, headless and muted: the context, precision and shader
  faults pass in WebKit and Chromium, and the native GPU restart passes. The texture fault still fails (meta row 151).
- Saves are `wildshard.save.v2@2.<scope>`: the drills read the old names. A navigation is a main-frame navigation
  request, since the page rewrites its own address in place (J522). `renderer:waiting` is read while it is still in
  the 32-checkpoint trace.
- Precision that never comes back is waited on: the stuck watch's fatal card names step `renderer` after a minute. A
  fault inside the shard load gets the load-failure screen, whose report now carries the boot checkpoints (engine
  `135ebd939`). A local page never sends to Sentry (SZ2), so any envelope fails the drill.
- The texture fault injects at the world's first compressed upload (`assembly`). The grid boot draws frames while it
  loads, so that upload skips the engine's GL error check: no card, no report (row 151).
