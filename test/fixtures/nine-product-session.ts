import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadHeadlessFolder } from '@wildshard/engine/host/headlessFolder';
import { loadRapier } from '@wildshard/engine/physics/rapier';
import { outputDescriptor } from '@wildshard/engine/game/shardfile/outputDescriptor';
import { createNativeProofAdapter } from '@wildshard/engine/test/headless-native';
import { nineHeadlessRuntime } from './nine-headless';

export async function nineRuntimeInput() {
  const directory = 'out/nine-dragon-stack', product = await loadHeadlessFolder(directory);
  const descriptor = outputDescriptor(product.shardfile);
  if (descriptor === undefined) throw new Error('Missing admitted Nine output');
  const assets = new Map(descriptor.index.files.map(file => [file.commons === true ? `commons:${file.hash}` : file.hash,
    Uint8Array.from(readFileSync(`${directory}/${file.path}`))]));
  const require = createRequire(import.meta.resolve('@wildshard/engine/package.json'));
  const rapier = await loadRapier(readFileSync(require.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  return { product, shard: product.shardfile, assets, rapier };
}

/** The original native adapter and flat control, running this CI build's own product.
 * Direct adapters throw on errors; no worker quarantine can mask a failure. */
export async function openNineSession(variant?: 'nine-flat', slug = 'nine-dragon-stack') {
  if (variant === 'nine-flat' && slug !== 'nine-dragon-stack') throw new Error('Native proof variant does not match product');
  const input = await nineRuntimeInput();
  if (input.product.slug !== slug) throw new Error('Native product identity differs');
  const sim = await createNativeProofAdapter(input, nineHeadlessRuntime(variant !== 'nine-flat'));
  return { product: input.product, sim };
}
