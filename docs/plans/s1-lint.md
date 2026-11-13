# S1 byte-preserving lint debt

**Status:** done (2026-11-13, meta SHARD-AUTHORING SA6, J317): the
generator-imports ratchet is gone. The SDK rule allows `node:path`, and
the browser bakers' byte helpers are the shard's own
(`generators/bakeBytes.mjs`): the repo-root `scripts/bake-output.mjs`
never came over in the lift. The rest below is history.

Baseline: 317da8825c4e8f19d4ad9e4887fa428da4413fab.
The zero-allowance AST census confirms both recorded counts in each
file. Both files are under generators/, an explicit raw map input.
Changing their imports changes map.tilesHash and shipped product
bytes, even for an otherwise equivalent author API.

| File under generators/ | Counts | Boundary left open |
| --- | ---: | --- |
| bake-glyphs.mjs | 2 | node:path and scripts/bake-output.mjs |
| bake-sign-atlas.mjs | 2 | node:path and scripts/bake-output.mjs |

Before and after pnpm build:shards, without --reuse, compare equal:
714 product files, 156544303 raw bytes. All paths, packed
blobs, map keys, index and validation receipts are compared; no masks.
No producer source, dependency, rule or ratchet changed.

Acceptance for both open rows: separately authorize changed product
bytes, repair the author boundary, rebuild and validate, then reduce
only the actual counts. Do not narrow map inputs to force equality.
