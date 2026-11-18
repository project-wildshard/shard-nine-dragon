import { expect, test } from 'vitest';
import { BufferGeometry, DataUtils, Float16BufferAttribute, Float32BufferAttribute } from 'three';
import { halfSpillL0 } from '../src/generators/scene';

// MG10 / ONE-FORMAT OF-EM28b1: L0 nodes hand the slab cook their light spill as four halves a vertex (8 bytes, Metal's
// 4-byte stride), within 0.004 of the float bake; the source geometry (the coarse copy's) keeps its floats.
test('an L0 node carries its spill as half floats, padded to four, within 0.004 of the float bake', () => {
  const values = [0, 0.001, 0.5, 1, 2.25, 3.3333, 4.9, 5.1, 0.07];
  const source = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(new Float32Array(9), 3)).setAttribute('aSpill', new Float32BufferAttribute(values, 3));
  const l0 = halfSpillL0(source), spill = l0.getAttribute('aSpill');
  expect(spill).toBeInstanceOf(Float16BufferAttribute);
  expect(spill.itemSize).toBe(4); expect(spill.count).toBe(3); expect(spill.array.byteLength).toBe(3 * 8);
  for (let v = 0; v < 3; v++) {
    for (let k = 0; k < 3; k++) expect(Math.abs(DataUtils.fromHalfFloat(spill.array[v * 4 + k] ?? 0) - (values[v * 3 + k] ?? 0))).toBeLessThanOrEqual(0.004);
    expect(spill.array[v * 4 + 3]).toBe(0);
  }
  expect(source.getAttribute('aSpill').array).toBeInstanceOf(Float32Array);
  expect(l0.getAttribute('position')).not.toBe(source.getAttribute('position'));
  const none = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(new Float32Array(3), 3));
  expect(halfSpillL0(none)).toBe(none);
});
