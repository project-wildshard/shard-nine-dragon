// oxlint-disable-next-line import/no-nodejs-modules -- The guard checks actual source imports, not a parallel list.
import { readFileSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Resolve only the real factory source under test.
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { parseSync } from 'vite';
import { generatorImportViolation } from './fixtures/generator-imports.mjs';
import { nineShardfileFrom } from '../src/generators/shardfileDefinition';
import product, { nineShardfile, inputs } from './fixtures/nine-shardfile-inputs';


test('owned inputs compose the supplied view contract', () => {
  const declaration = nineShardfileFrom(inputs);
  expect(declaration).toEqual(product);
  expect(nineShardfileFrom(inputs, { pages: 3 })).toEqual(nineShardfile({ pages: 3 }));
});

test('the declaration factory admits supplied inputs instead of consulting a generated file', () => {
  expect(() => nineShardfileFrom({ ...inputs, navigation: { ...inputs.navigation, navigation: { ...inputs.navigation.navigation, file: 'bad' } } })).toThrow();
  const path = resolve('src/generators/shardfileDefinition.ts');
  const parsed = parseSync(path, readFileSync(path, 'utf8'));
  expect(parsed.errors).toEqual([]);
  for (const node of parsed.program.body) if (node.type === 'ImportDeclaration') {
    expect(node.source.value).not.toContain('.generated.');
    expect(generatorImportViolation(path, node.source.value), node.source.value).toBeNull();
  }
});

test('Nine activates the ordinary grapple, portal and melee rows', () => {
  expect(product.runtime).toBeNull();
  expect(product.entryways.every(row => row.kind === 'portalLink')).toBe(true);
  expect(product.modes?.grapple?.[0]).toMatchObject({ id: 'fei-zhua', guard: 'nds-grapple-guard', rise: true });
  expect(product.modes?.grapple?.[0]?.hooks?.length).toBeGreaterThan(0);
  const guard = product.props?.colliders.find(row => row.id === 'nds-grapple-guard');
  expect(guard?.shapes).toHaveLength(2);
  const banyan = product.props?.colliders.find(row => row.id === 'nds-banyan.paifang');
  expect(banyan?.shapes[0]).toMatchObject({ kind: 'hull', surface: 'stone' });
  const jian = product.items.rows.find(row => row.id === 'weapon.jian');
  expect(jian).toMatchObject({ family: 'kit.melee', light: { damage: 12 }, heavy: { damage: 24 } });
});
