import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from 'three';
import { expect, test } from 'vitest';
import { readImagePixels } from '@wildshard/sdk/bake/image';
import { leafTexels } from '../src/generators/leafTexels';
import { canopyGeometries, LEAF_COUNT, type Lump } from '../src/generators/canopyGeometry';

// QA 2026-11-24 row 52 (J510: no flat image stands in for a 3D object; the shard's own "real bars, never cut-out
// cards"): the banyan's crown is geometry leaves, each sampling one solid texel of the leaf atlas.
const ROOT = resolve(import.meta.dirname, '..'), FILE = resolve(ROOT, 'src/data/leafTexels.json');

test('the leaf texel table is current with the leaf atlas', async () => {
  const atlas = await readImagePixels(new Uint8Array(readFileSync(resolve(ROOT, 'public/assets/nine-dragon/lab/organic/leaf-atlas.webp'))));
  const fresh = `${JSON.stringify(leafTexels(atlas))}\n`;
  if (process.env['WRITE_LEAF_TEXELS'] === '1') writeFileSync(FILE, fresh);
  expect(readFileSync(FILE, 'utf8')).toBe(fresh);
});

test('the crown draws leaves, not picture cards', () => {
  const lumps: Lump[] = [{ c: new Vector3(0, 8, 0), r: new Vector3(3, 1.6, 3), up: 0, seed: 1, wash: 0 }];
  const { cards } = canopyGeometries(lumps), uv = cards.getAttribute('aUv'), index = cards.getIndex();
  expect(index).not.toBeNull();
  const ids = index?.array ?? [];
  expect(ids.length / 3 % (LEAF_COUNT * 2)).toBe(0);
  for (let i = 0; i < ids.length; i += 3) {
    const [a, b, c] = [ids[i] ?? 0, ids[i + 1] ?? 0, ids[i + 2] ?? 0];
    // one texel per leaf: a triangle maps no area of the atlas
    expect([uv.getX(b), uv.getY(b), uv.getX(c), uv.getY(c)]).toEqual([uv.getX(a), uv.getY(a), uv.getX(a), uv.getY(a)]);
  }
});

test('no railing, glazing or net is an alpha-cut card (realBars.ts builds them)', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = resolve(ROOT, 'src/generators'), offenders: string[] = [];
  for (const name of readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
    const text = readFileSync(resolve(dir, name), 'utf8');
    if (/\bctx\.alpha\(|\.alpha\('|\bka\.quad/u.test(text)) offenders.push(name);
  }
  expect(offenders).toEqual([]);
});
