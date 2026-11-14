# SA11: Nine Dragon shard text

> Written by: Claude

J317 retires `product` from author-facing names (meta
SHARD-AUTHORING SA11, same conventions as shard-pine-hollow `7e6e505`).
Renamed files: `generators/product.ts` to `shardfile.ts`
(`readNineShardfileInputs`, `nineShardfile`), `productDefinition.ts` to
`shardfileDefinition.ts` (`NineShardfileInputs`, `nineShardfileFrom`),
`productOutput.ts` to `outputDefinition.ts`, `worldProduct.ts` to
`worldData.ts` (`NineWorldData`, `nineWorldData`), `hookProduct.ts` to
`hookSpecimen.ts` (`HookSpecimen`, beside `data/hookSpecimen.json`), and
the fixtures `nine-product-inputs` to `nine-shardfile-inputs` and
`nine-practice-product` to `nine-practice-program`. Comments and
`src/README.md` say shard file, program or output by what they mean.

Kept: `parseWorldSceneModels({ product })` (sharddev option);
`explorerModels.json`'s `product` key and `signTextureSources.json`'s
`"kind": "product"` (wire data); the `@wildshard/format/product`
import; `lookGraph.ts` / `compositeGraph.ts`'s `product` (a `mul` node,
a math term) and Blender's `DOT_PRODUCT`; the engine's headless loader,
its `product` keys and the CI helpers handed that object; the lifted
fixtures typed on the engine's `ShardProduct` (`nineHeldEntry.ts`,
`nine-headless.ts`, `productFile.ts`); the CI proofs every shard repo
shares. Those change with SA23 / SA25 across all shard repos at once.

`pnpm test` and `pnpm check` pass. A generator edit makes the hero
stale; the revision pass rebuilds it. No upload.
