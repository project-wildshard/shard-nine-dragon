// oxlint-disable-next-line import/no-nodejs-modules -- Admit committed native glyph bytes from their declared public inputs.
import { readFileSync } from 'node:fs';
import inputs from '../../src/data/nativeGlyphs.json' with { type: 'json' };
import { admitNativeGlyphs } from '../../src/generators/nativeGlyphs';

/** The same six checked native raster files supplied by the real shard entry. */
export const nativeGlyphs = admitNativeGlyphs(new Map(inputs.map(row => [row.name,
  new Uint8Array(readFileSync(`public${row.input}`))])), inputs);
