import { expect, test } from 'vitest';
import { beforePortalClearance } from './fixtures/portal-rail-history';
import { encodeCanonicalJson, hashImmutableBytes } from '@wildshard/sdk/immutable';
import { fencedNativeOracle } from './fixtures/native-oracle';
import { nineNativeOracle, NINE_NATIVE_ORACLE } from './fixtures/nine-native-oracle';
import { nineNativeOracleInputs } from './fixtures/nine-native-oracle-inputs';

test('the fenced typed Nine oracle retains the complete former shipping wire', async () => {
  const wire = new TextEncoder().encode(JSON.stringify(await nineNativeOracle()));
  expect(wire.byteLength).toBe(731);
  expect(hashImmutableBytes(wire)).toBe('0316e2deaa4976a3a3b232f6aeb0bccac20bef74559f3af4e42411e6cca8a117');
});

test('a divergent cached parent cannot supply native policy facts', async () => {
  await expect(fencedNativeOracle(NINE_NATIVE_ORACLE, () => {
    const rows = nineNativeOracleInputs(); rows.constants.jianPolicy.eye += 1; return rows;
  })).rejects.toThrow('differs from its fenced source constructor');
});

test('the fenced typed Nine oracle retains every former constants byte', async () => {
  const { nineNativeConstants } = await import('./fixtures/nine-native-constants');
  const wire = new TextEncoder().encode(JSON.stringify(beforePortalClearance(await nineNativeConstants(), 8), (_key, entry: unknown) =>
    typeof entry === 'number' && Object.is(entry, -0) ? '-0' : entry));
  // NET-LAG (2026-11-17): +223 bytes, the balustrade's stone along the square and the street (generators/floorBoxes.ts)
  expect(wire.byteLength).toBe(99791);
  expect(hashImmutableBytes(wire)).toBe('562ccf86540c6ecaac0af2afa28547e2376732c70689b383cd05eedeb4316d94');
});
