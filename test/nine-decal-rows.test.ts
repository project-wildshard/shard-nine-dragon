import { expect, test } from 'vitest';
import { canvasAtlasRows } from '@wildshard/sharddev/bake/canvasAtlas';
import decals from '../src/data/decals.json' with { type: 'json' };

test.each([decals.JIAN_DECALS, decals.HERO_DECALS])('authored decals cross atlas admission', row => {
  expect(canvasAtlasRows(row)).toEqual(row);
});

test('atlas admission rejects executable paint and invalid dimensions', () => {
  expect(() => canvasAtlasRows({ w: 2, h: 2, steps: [() => undefined] })).toThrow();
  expect(() => canvasAtlasRows({ w: 2, h: Number.NaN, steps: [] })).toThrow();
});
