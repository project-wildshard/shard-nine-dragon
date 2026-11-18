import { BufferAttribute, BufferGeometry } from 'three';
import { expect, test } from 'vitest';
import { packSlabGraphChannels, SLAB_FLAG_MARKER, SLAB_MISC_SCALE, SLAB_OFFSET_SCALE, SLAB_SPILL_SCALE, SLAB_SPILL_WORD } from '../src/generators/slabGraphChannels';

test('Nine slab graph lanes keep every flag and the signed grid offsets', () => {
  const input = new BufferAttribute(Float32Array.of(2.2, 1.8, 0.9, 24_335, 0, 1, 0, 0), 4);
  const offsets = new BufferAttribute(Float32Array.of(-229.45, 227.16, 0.04, -0.19), 2);
  const geometry = new BufferGeometry().setAttribute('aMisc', input).setAttribute('aOff', offsets);
  geometry.setAttribute('aSpill', new BufferAttribute(Float32Array.of(5.09, 2.68, 1.95, 0.04, 0.01, 0.1), 3));
  geometry.setAttribute('aPat', new BufferAttribute(Float32Array.of(0, 3.19921875, 2.3984375, 0, 0, 0, 0, 0), 4));
  const inputSpill = geometry.getAttribute('aSpill');
  packSlabGraphChannels(geometry, true);
  expect(geometry.getAttribute('aPat')).toBeUndefined();
  const spill = geometry.getAttribute('aSpill');
  expect(spill.array).toBeInstanceOf(Uint16Array);
  for (let vertex = 0; vertex < inputSpill.count; vertex++) {
    const first = spill.getX(vertex), second = spill.getY(vertex);
    const restored = [Math.floor(first / 64) * 2, (first % 64) * 16 + Math.floor(second / SLAB_SPILL_WORD), second % SLAB_SPILL_WORD];
    for (const [lane, word] of restored.entries()) {
      expect(Math.abs(word / SLAB_SPILL_SCALE - inputSpill.getComponent(vertex, lane)))
        .toBeLessThanOrEqual((lane === 0 ? 1 : 0.5) / SLAB_SPILL_SCALE);
    }
  }
  const misc = geometry.getAttribute('aMisc'), off = geometry.getAttribute('aOff');
  expect(misc.array).toBeInstanceOf(Uint16Array);
  expect(off.array).toBeInstanceOf(Int16Array);
  expect(misc.normalized).toBe(false);
  expect(off.normalized).toBe(false);
  for (let vertex = 0; vertex < input.count; vertex++) {
    expect(misc.getW(vertex) - SLAB_FLAG_MARKER).toBe(input.getW(vertex));
    for (let lane = 0; lane < 3; lane++) {
      expect(Math.abs(misc.getComponent(vertex, lane) / SLAB_MISC_SCALE - input.getComponent(vertex, lane)))
        .toBeLessThanOrEqual(0.5 / SLAB_MISC_SCALE);
    }
    for (let lane = 0; lane < 2; lane++) {
      expect(Math.abs(off.getComponent(vertex, lane) / SLAB_OFFSET_SCALE - offsets.getComponent(vertex, lane)))
        .toBeLessThanOrEqual(0.5 / SLAB_OFFSET_SCALE);
    }
  }
  geometry.dispose();
});
