# generator-imports paid to zero (opus-sa6)

Meta SHARD-AUTHORING SA6 (J170, J317).

- The author lint now loads sharddev's `wildshard-sdk` plugin
  (`node_modules/@wildshard/sharddev/lint/sdk-plugin.mjs`, pin `efbdc25`).
  Its `generator-imports` allows the shard format, valibot and `node:*`, so
  `node:path` in the two browser bakers passes.
- The bakers' other hit was `../../../../scripts/bake-output.mjs`, a file
  that never came over in the lift: `bake-glyphs.mjs`, `bake-sign-atlas.mjs`
  and `bake/bake-nine-decal-atlas.mjs` could not run. Their byte helpers
  (`byteWriter`, `jsonBytes`, `outputHash`, `browserBakeBytes`) are now the
  shard's own `generators/bakeBytes.mjs`, ported from engine's
  `scripts/bake-output.mjs` without its tool-version log. Engine's JSON
  guard is ported as this shard needs it: no allowance file, so every JSON
  write must stay in the repo and hold no byte arrays, base64 runs or
  `data:` URIs.
- Moving the bakers to `bake/` was tried and dropped: their base64 allowance
  is recorded in engine's `base64-debt.json` under the `generators/` path.
- The ratchet entries are deleted and the rule is a plain error. The
  `generators/` edit changes `tilesHash`, so the shard uploads with the
  one-revision-per-shard pass, not now.
