import { expect, test } from 'vitest';
import manifest from '../src/manifest.json' with { type: 'json' };

// NB16 (QA 2026-11-15 mini row 5): Nine's runtime draws its whole cell itself. Without `cellGround: 'world'` the grid
// page also admits the cell's coarse L1 ring tiles under its grid-cell root (engine DL17 + D189, `admitsCellTiles`), and
// they draw over the full-detail world: black facets on the Well's lotus finial, a black, stepped, flickering wet street.
test('Nine declares that its world draws its whole cell ground', () => {
  expect(manifest.gridShardfile).toBe('/shardfiles/nine-dragon-stack/shard.json');
  expect(manifest.cellGround).toBe('world');
});
