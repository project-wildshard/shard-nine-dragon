import { inputs } from './fixtures/nine-shardfile-inputs';
import { bootDiscovery } from './fixtures/nine-boot-discovery';
import { afterAll, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import manifest from '../src/manifest.json' with { type: 'json' };
import { authoredManifestSource } from '@wildshard/sdk/headless/scripts/authored-manifest.mjs';
import { parseDiscoveryValues } from '@wildshard/format/discoveryValues';
// oxlint-disable-next-line import/no-nodejs-modules -- Inspect the defining compiler output in this clean source tree.
import { resolve } from 'node:path';

// Loan the real current shard to the legacy emitter's monorepo layout.
mkdirSync('tmp/codex-pins', { recursive: true });
const root = mkdtempSync(resolve('tmp/codex-pins/manifest-'));
mkdirSync(resolve(root, 'src/shards'), { recursive: true });
symlinkSync(resolve('src'), resolve(root, 'src/shards/nine-dragon-stack'));
mkdirSync(resolve(root, 'scripts'));
writeFileSync(resolve(root, 'scripts/manifest-art-inputs.json'), JSON.stringify({ 'nine-dragon-stack': [{ file: 'data/discovery.json', field: ['extraArt'] }] }));
afterAll(() => rmSync(root, { recursive: true, force: true }));

test('Nine compiles a data-only entry without retired runtime imports', () => {
  expect(Object.hasOwn(manifest, 'trustedRuntime')).toBe(false);
  // OF21 r6: an ordinary upload names no client-plan entry (the engine admits it as data)
  expect(Object.hasOwn(manifest.bindings, 'entry')).toBe(false);
  expect(() => authoredManifestSource(root, 'nine-dragon-stack', { composed: manifest, metadataOnly: true })).toThrow('missing or invalid program discovery value boot.explore');
  const source = authoredManifestSource(root, 'nine-dragon-stack', { composed: manifest, metadataOnly: true, discovery: parseDiscoveryValues({ ...bootDiscovery, navigation: { ...inputs.navigation } }) });
  expect(source).not.toContain('navigation.generated');
  expect(source).not.toContain('.declaredClientPlanEntry(');
  expect(source).not.toContain('nativeModule');
  expect(source).not.toContain('./plugin');
  expect(source).not.toContain('./runtime/index');
});

test('each computed boot binding refuses an absent current-product value', () => {
  for (const slot of ['poses', 'boot.files', 'boot.sources', 'boot.explore']) {
    const discovery: Record<string, unknown> = { ...bootDiscovery, navigation: { ...inputs.navigation } }; delete discovery[slot];
    expect(() => authoredManifestSource(root, 'nine-dragon-stack', { composed: manifest, metadataOnly: true, discovery: parseDiscoveryValues(discovery) })).toThrow(`missing or invalid program discovery value ${slot}`);
  }
  const source = authoredManifestSource(root, 'nine-dragon-stack', { composed: manifest, metadataOnly: true, discovery: parseDiscoveryValues({ ...bootDiscovery, navigation: { ...inputs.navigation } }) });
  for (const name of ['poses', 'files', 'sources', 'explore']) expect(source).not.toContain(`./boot/${name}.generated.json`);
});
