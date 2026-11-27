// oxlint-disable-next-line wildshard/layer -- Engine 0.1.42 predates the SDK dev package layer.
import { bootFilePolicy, sharedBootPhysics, type BootSources, type BootTextures, type BootTier } from '@wildshard/dev/bootInventory';
import { GPU_FILES } from '../ktx2.generated';

/** The structure-first world's original counted inventory, authored beside its manifest. */
export function bootSources(tier: BootTier, tex: BootTextures, world: readonly string[], inventory: Readonly<Record<string, number | true>>): BootSources {
  const { gpu } = bootFilePolicy(tier, tex, GPU_FILES, inventory);
  const root = '/assets/nine-dragon-stack/baked/';
  return {
    sky: [], baked: Object.keys(inventory).filter((url) => url.startsWith(`${root}tex/`) && !url.includes('.phone.')).map(gpu),
    terrain: [], trees: [], cabins: [],
    // Navigation reads the admitted shard file's original WSNM file once, outside the legacy boot pack.
    physics: sharedBootPhysics(),
    props: world.filter((url) => url in inventory).map(gpu), art: [], music: [], sfx: [],
  };
}
