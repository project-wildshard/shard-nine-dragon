# Shard source moves to src/ (SA24, opus-sa24b)

> Written by: Claude (opus-sa24b), 2026-11-13

- `src/shards/nine-dragon-stack/` is now `src/` (meta SHARD-AUTHORING SA24, J317):
  a single-shard repo keeps its shard at the top of `src/`.
- Pins: sharddev `7681ecb` (`@wildshard/sdk` v0.2.8, SA44: finds the
  repo root from `src/`) and engine `dbc3f7cc` (SA45: author lint reads
  a single-shard `src/`), same github-SHA style.
- Outside `src/`: the `lint:shards` target, format and lint globs,
  `.oxlintrc.author.json` globs, `.gitattributes`, `.gitignore`, the
  vitest include, `scripts/publish-public.mjs`, the test-boundary walk,
  this shard's `scripts/blender/targets.json` entries, docs and the test
  imports.
- Kept: `src/` is byte-identical, so the hero stamp stays fresh. Path
  labels that reach the shard file (`file:` provenance, `"source"`,
  manifest URLs) stay `src/shards/nine-dragon-stack/...`; sdk v0.2.8 resolves them.
  `lint/ratchet.json` keys stay too (engine lint maps `src/x` to them).
- `pnpm build:shards` gives the same shard file but for one field:
  `sections/look/map.json` `tilesHash` (and so `shard.json`). The map
  staleness key hashes `data/map.json` inputs by their path from the
  shard folder, and its `../../../public/...` inputs now point above the
  repo, so they drop out of the key. The map pixels are unchanged.
  Making them `../public/...` changes `data/map.json`, which stales the
  hero, so both wait for the next hero capture.
- Files inside `src/` that climb out of the shard by relative path
  (`data/map.json` inputs; the bake tools `bake/bake-nine-decal-atlas.mjs`, `blender/viewmodel/rig/check-clips.mjs`, `generators/bake-glyphs.mjs`, `generators/bake-sign-atlas.mjs`) are left for the next hero capture, since any byte change
  there stales it.
- Engine lint's `no-base64` rule keys its debt by the file's own path
  (`src/generators/bake-glyphs.mjs` now), not the SA45 shard-source
  mapping, so `lint/base64-debt.json` carries this shard's row and
  `lint:shards` points `WILDSHARD_BASE64_FILE` at it until engine maps
  it too.
