# A checkpoint passes on another platform's bytes from the same engine on

SHARD-COMPAT PR6 follow-up. On engine 0.1.80, Driftwood on darwin walks to linux's checkpoint digest, so a local Mac run failed under the newest-recorded rule. An engine with no row of its own now also passes on another platform's digest recorded at or after this platform's newest engine. Platforms differ only by float and Rapier math, so equal bytes mean the engine made them agree. `test/ci/bump-only.test.mjs` covers it, including that an older engine's row on another platform does not count. opus-pr6.
