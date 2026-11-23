import { expect, test } from 'vitest';
import { snapshotSimHost, serializeSimSnapshot, decodeSimSnapshot } from '@wildshard/engine/sim/snapshot';
import { openWorld } from '@wildshard/engine/host/openWorld';
import { nineRuntimeInput } from '../fixtures/nine-product-session';

// G498: evict the ordinary product, then re-enter via the served world's installer.
test('Nine evicts and re-enters with its declared kit and progress', async () => {
  const input = await nineRuntimeInput();
  const first = await openWorld(input, { room: true });
  let saved;
  try {
    first.host.flags.set('seen:lantern-square');
    first.step([]);
    saved = decodeSimSnapshot(serializeSimSnapshot(snapshotSimHost(first.host)));
    expect(Object.keys(saved.adapters).length).toBeGreaterThan(0);
  } finally { first.dispose(); }
  const again = await openWorld(input, { room: true, snapshot: saved });
  try {
    const restored = snapshotSimHost(again.host);
    expect(restored.flags).toEqual(saved.flags);
    expect(restored.quests).toEqual(saved.quests);
    expect(restored.slots).toEqual(saved.slots);
    expect(restored.adapters).toEqual(saved.adapters);
    again.step([]);
    expect(again.host.state.tick).toBe(saved.state.tick + 1);
    expect(again.host.flags.has('seen:lantern-square')).toBe(true);
  } finally { again.dispose(); }
}, 30_000);
