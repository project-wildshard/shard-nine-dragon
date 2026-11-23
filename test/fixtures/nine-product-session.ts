import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadHeadlessFolder } from '@wildshard/sdk/headless/host/headlessFolder';
import { loadRapier } from '@wildshard/sdk/headless/physics/rapier';
import { outputDescriptor } from '@wildshard/sdk/headless/game/shardfile/outputDescriptor';
import { openNineDataWorld } from '../ci/nine-data-world.mjs';
import { enginePackageUrl } from '@wildshard/sdk/headless';

export async function nineRuntimeInput() {
  const directory = 'out/nine-dragon-stack', product = await loadHeadlessFolder(directory);
  const descriptor = outputDescriptor(product.shardfile);
  if (descriptor === undefined) throw new Error('Missing admitted Nine output');
  const assets = new Map(descriptor.index.files.map(file => [file.commons === true ? `commons:${file.hash}` : file.hash,
    Uint8Array.from(readFileSync(`${directory}/${file.path}`))]));
  const require = createRequire(enginePackageUrl);
  const rapier = await loadRapier(readFileSync(require.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  return { product, shard: product.shardfile, assets, rapier };
}

/** Real product simulation, with a flat-path control for the claw's rise. */
export async function openNineSession(variant?: 'nine-flat', slug = 'nine-dragon-stack') {
  if (variant === 'nine-flat' && slug !== 'nine-dragon-stack') throw new Error('Grapple proof variant does not match product');
  const input = await nineRuntimeInput();
  if (input.product.slug !== slug) throw new Error('Nine product identity differs');
  const { shard } = input;
  if (variant !== 'nine-flat') return { product: input.product, sim: openNineDataWorld(input) };
  if (shard.modes?.grapple === undefined) throw new Error('Missing Nine grapple mode');
  const flat = { ...shard, modes: { ...shard.modes, grapple: shard.modes.grapple.map(row => ({ ...row, rise: false })) } };
  return { product: input.product, sim: openNineDataWorld({ ...input, shard: flat }) };
}
