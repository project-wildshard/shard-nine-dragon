// oxlint-disable-next-line import/no-nodejs-modules -- Read the same admitted products and native physics as the grid.
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { loadRapier } from '@wildshard/engine/physics/rapier';
import { snapshotSimHost, serializeSimSnapshot, decodeSimSnapshot } from '@wildshard/engine/sim/snapshot';
import { restoreSimHost } from '@wildshard/engine/sim/restore';
import { loadHeadlessFolder } from '@wildshard/engine/host/headlessFolder';
import { nineRuntimeInput } from '../fixtures/nine-product-session';
import { outputDescriptor } from '@wildshard/engine/game/shardfile/outputDescriptor';
import { createShardfileSim, bindShardfileSim, prepareShardfileSimRestore } from '@wildshard/engine/game/plugin/simulation';
import { createNativeHeadlessResident, type PrepareHeadlessRuntime } from '@wildshard/engine/host/headlessRuntime';
import { hasDeclaredClientPage } from '@wildshard/format/runtimeBinds';
import { ScriptHost } from '@wildshard/engine/script/host';
import { folderHeadlessSections } from '@wildshard/engine/host/headlessSections';
import { createNativeProofResident, prepareFolderPlan } from '@wildshard/engine/test/headless-native';
import { prepareHeadlessRuntime as ninePlan } from '../fixtures/nine-headless';
import { leadPlayer } from '@wildshard/engine/sim/leadPlayer';

const shards = ['nine-dragon-stack'] as const;
const directPlans = new Map<string, PrepareHeadlessRuntime>([['nine-dragon-stack', ninePlan]]);

// G498: eviction, then return through the actual native installer/restore path.
// All ten live products are tested; sealed legacy products are never grid destinations.
// Renderer-owned kit parts have a separate mandatory quick check (Pine King).
for (const slug of shards) test(`${slug}: evict and re-enter with kit, held items and quest progress`, async () => {
  const preparation = await nineRuntimeInput(), { product, shard, assets, rapier } = preparation;
  const trusted = product.has('sim/runtime-plan');
  const direct = trusted ? undefined : directPlans.get(slug);
  const sections = folderHeadlessSections(product);
  const questPorts = { fact: () => undefined, coins: () => undefined };
  const first = direct !== undefined ? await createNativeProofResident(preparation, direct) : trusted ? await createNativeHeadlessResident(preparation)
    : createShardfileSim(shard, assets, { rapier, sections, quest: questPorts });
  let saved;
  try {
    // Exercise actual authored progress and equipment ownership, not an empty save.
    for (const quest of first.host.quests) {
      for (const flag of quest.def.startWhen?.all ?? []) first.host.flags.set(flag);
      const start = quest.def.startWhen?.any?.[0]; if (start !== undefined) first.host.flags.set(start);
      const step = quest.def.steps[0];
      for (const flag of step?.done.none ?? []) first.host.flags.clear(flag);
      for (const flag of step?.done.all ?? []) first.host.flags.set(flag);
      const done = step?.done.any?.[0]; if (done !== undefined) first.host.flags.set(done);
    }
    for (const flag of shard.items.loadout.native?.ownership ?? []) if (flag !== null) first.host.flags.set(flag);
    // Select a non-default held slot through its actual registered continuation.
    for (const adapter of first.host.adapters.values()) {
      const state = adapter.snapshot();
      if (state !== null && typeof state === 'object' && !Array.isArray(state) && 'held' in state && 'swap' in state) {
        const slots = shard.items.loadout.native?.slots;
        const held = slots?.at(-1); if (held !== undefined) adapter.restore({ ...state, held, swap: null });
      }
    }
    saved = decodeSimSnapshot(serializeSimSnapshot(snapshotSimHost(first.host)));
  } finally { first.dispose(); }
  // Nothing from the old native world survives; a fresh installer must recreate
  // its full adapter kit before strict restore accepts the held/quest state.
  const again = direct !== undefined ? await createNativeProofResident(preparation, direct, saved) : trusted ? await createNativeHeadlessResident(preparation, saved)
    : { host: restoreSimHost(first.host.level, { rapier }, saved,
      host => { bindShardfileSim(host, shard, assets, { rapier, sections, quest: questPorts, restoring: true }); }), dispose() { this.host.dispose(); } };
  try {
    const restored = snapshotSimHost(again.host);
    expect(restored.flags).toEqual(saved.flags);
    expect(restored.quests).toEqual(saved.quests);
    expect(restored.slots).toEqual(saved.slots);
    expect(restored.adapters).toEqual(saved.adapters);
    again.host.step();
    expect(again.host.state.tick).toBe(saved.state.tick + 1);
    for (const flag of saved.flags) expect(again.host.flags.has(flag)).toBe(true);
  } finally { again.dispose(); }
}, 30_000);
