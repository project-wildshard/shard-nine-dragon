import type { BootSources, BootTextures, BootTier } from '@wildshard/sharddev/bootInventory';
import { GPU_FILES } from '../ktx2.generated';

// NB18: sdk 0.3.4's `bootInventory` imports engine boot/bakedApi, whose dynamic imports split the author bundle in two
// ("config must bundle as one module"), and shard source may not import the engine itself: Nine resolves its own boot names
// with the engine's `filePolicy` rule (a phone `.phone.` stand-in when the inventory holds one, then its GPU file in ktx2
// mode). Nine's names are all its own, so its table is the whole lookup. The physics row is the engine's Rapier file.
const RAPIER_WASM_URL = '/assets/physics/rapier.wasm';
function bootFilePolicy(tier: BootTier, mode: BootTextures, table: Readonly<Record<BootTier, Readonly<Record<string, string>>>>, inventory: Readonly<Record<string, number | true>>): { gpu: (url: string) => string } {
  const files = table[tier];
  const phone = (url: string): string => {
    if (tier !== 'phone') return url;
    const match = /^(.*)\.(png|jpg|webp|glb)$/u.exec(url);
    if (match === null) return url;
    const candidate = `${match[1] ?? ''}.phone.${match[2] === 'glb' ? 'glb' : 'webp'}`;
    return candidate in inventory ? candidate : url;
  };
  return { gpu: (url: string): string => { const mapped = phone(url); return mode === 'ktx2' ? files[mapped] ?? mapped : mapped; } };
}

/** The structure-first world's original counted inventory, authored beside its manifest. */
export function bootSources(tier: BootTier, tex: BootTextures, world: readonly string[], inventory: Readonly<Record<string, number | true>>): BootSources {
  const { gpu } = bootFilePolicy(tier, tex, GPU_FILES, inventory);
  const root = '/assets/baked/nine-dragon-stack/';
  return {
    sky: [], baked: Object.keys(inventory).filter((url) => url.startsWith(`${root}tex/`) && !url.includes('.phone.')).map(gpu),
    terrain: [], trees: [], cabins: [],
    // Navigation reads the admitted shard file's original WSNM file once, outside the legacy boot pack.
    physics: [RAPIER_WASM_URL],
    props: world.filter((url) => url in inventory).map(gpu), art: [], music: [], sfx: [],
  };
}
