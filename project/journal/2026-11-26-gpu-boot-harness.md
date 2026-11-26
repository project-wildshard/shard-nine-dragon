# The GPU boot harness serves through the SDK (opus-held125, meta QA 11-25 row 125)

- `src/scripts/test-nine-gpu-boot.sh` started engine's `scripts/preview-server.mjs` and ran engine's
  `scripts/test-facade-instancing.mjs`, neither of which came across. It now serves the build with the SDK's own
  `wildshard dev src <port>` (which builds first; up to five minutes for the first build), calls the bin directly so
  a signal reaches the server, and stops it with SIGTERM then a second signal (dev's own close waits on the build).
  The facade test is dropped: engine runs it for its facade routing.
- Every browser run holds the Mac's GPU lock (`desktop-gpu.lock`, then `mini-measure.lock`, engine's
  `memory/iphone/locks.mjs` order) when the lock folder is there.
- Proof, from a clean clone: `wildshard dev` built Nine Dragon and served `/version.json` on 4184, and the harness
  drove headless, muted WebKit and Chromium against it. The fault assertions themselves cannot pass yet: the shards'
  `@wildshard/sdk/headless/scripts/zone-entry.mjs` is not in SDK 0.7.0 (sharddev plan/cp20-sdk, CP20), and a
  hand-linked SDK main + engine 0.1.95 stack never left the load step `gap` even with no fault. Meta QA 11-25 row 130
  holds the green run.
