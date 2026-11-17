// oxlint-disable-next-line import/no-nodejs-modules -- The room runs the shipped product bytes and physics module.
import { readFileSync } from 'node:fs';
import { parseNativeAssembly, NATIVE_ASSEMBLY_FILE } from '@wildshard/format/nativeAssembly';
import { expect, test } from 'vitest';
import { NetClient } from '@wildshard/engine/net/client';
import { NetRoom } from '@wildshard/engine/net/room';
import { SimNetWorld } from '@wildshard/engine/net/simWorld';
import { NET_BUTTONS } from '@wildshard/engine/input/netButtons';
import { loadRapier } from '@wildshard/engine/physics/rapier';
import { leadPlayer } from '@wildshard/engine/sim/leadPlayer';
import { serializeSimSnapshot, snapshotSimHostBytes } from '@wildshard/engine/sim/snapshot';
import { directLoopback } from '../fixtures/netLoopback';
import { hasNativeAssembly } from '@wildshard/engine/game/shardfile/nativeAssembly';
import { GRAPPLE_PHASES, grappleRow, NO_HOOK } from '../fixtures/grapple-wire';
import { outputDescriptor } from '@wildshard/engine/game/shardfile/outputDescriptor';
import { loadHeadlessProduct } from '@wildshard/engine/host/headlessProduct';
import type { CreatureRewardState } from '@wildshard/engine/game/saves';
import { openWorld } from '@wildshard/engine/host/openWorld';
import { nineRuntimeInput } from '../fixtures/nine-product-session';
import { encodeCanonicalJson } from '@wildshard/engine/host/immutable';
import { nineNativeConstants } from '../fixtures/nine-native-constants';
import { nineNativeOracle } from '../fixtures/nine-native-oracle';

// P1-E3.1b's row for Nine Dragon: its world from the built product alone. It has no terrain and no creatures, so what this
// proves is its pieces, its hooks and its claw, over the wire, as a client plays them.

async function shipped() {
  const input = await nineRuntimeInput(), { product, shard } = input;
  const descriptor = outputDescriptor(shard);
  if (descriptor === undefined) throw new Error('Missing admitted Nine output');
  return { product, shard, index: descriptor.index, input };
}
const text = async (product: Awaited<ReturnType<typeof shipped>>['product'], name: string): Promise<string> => new TextDecoder().decode(await product.file(name));

test('the product ships the facts the fixture lent, as server files only', async () => {
  const { product, index } = await shipped(), [constants, oracle] = await Promise.all([nineNativeConstants(), nineNativeOracle()]);
  expect(hasNativeAssembly(product)).toBe(true);
  expect(await text(product, 'server/pieces.json')).toBe(encodeCanonicalJson(constants.pieces));
  expect(await text(product, 'server/hooks.json')).toBe(encodeCanonicalJson(constants.hooks));
  expect(await text(product, 'server/grapple-profile.json')).toBe(encodeCanonicalJson(constants.grappleProfile));
  expect(await text(product, 'server/jian.json')).toBe(encodeCanonicalJson(oracle.constants.jianPolicy));
  expect(JSON.parse(await text(product, 'server/portal-ride.json'))).toEqual({ director: constants.portalRide.director, trigger: constants.portalRide.trigger, fade: constants.portalRide.fade, landings: constants.portalRide.landings });
  const plan = parseNativeAssembly(JSON.parse(await text(product, NATIVE_ASSEMBLY_FILE)));
  expect(plan.level.stand).toBe(constants.spawnY);
  // Engine 0.1.32 plus NB20's 5 cm parapet clearance proves the same
  // 92 lanes and eight transfers in 28 fewer ticks. All other facts stay pinned.
  expect(plan.entries.proven).toEqual({ ...constants.entryProof, steps: 15956 });
  expect(plan.features.map(row => row.host)).toEqual(['collision.pieces', 'item.swept', 'portal.ride', 'grapple']);
  const server = index.admission.server ?? [];
  expect(server.map(row => row.name)).toEqual(['server/grapple-profile.json', 'server/hooks.json', 'server/jian.json', 'server/native-assembly.json', 'server/pieces.json', 'server/portal-ride.json']);
  expect(server.reduce((sum, row) => sum + row.bytes, 0), 'J134: under 1 MB a shard').toBeLessThan(1_000_000);
  const client = new Set([...index.files.map(file => file.hash), ...(index.packs ?? []).flatMap(pack => pack.entries.map(entry => entry.hash))]);
  expect(server.filter(row => client.has(row.hash))).toEqual([]);
}, 120_000);

test('a client locks a hook and rides it over the wire, and the save holds the crossing', async () => {
  const profilesById = new Map<string, CreatureRewardState>();
  const profiles = { read: (id: string) => profilesById.get(id) ?? null, write: (id: string, state: CreatureRewardState) => { profilesById.set(id, structuredClone(state)); return true; } };
  const { input } = await shipped(), { hooks } = await nineNativeConstants(), live = await openWorld(input, { room: true, profiles }), { host } = live, lead = leadPlayer(host);
  const room = new NetRoom({ world: new SimNetWorld(host), step: inputs => { live.step(inputs); } }), link = directLoopback(), client = new NetClient(link.client);
  let back;
  try {
    room.open(); room.join(link.server); client.hello(); link.pump();
    const at = lead.position.clone(), index = hooks.findIndex(row => row.x > at.x + 15 && Math.abs(row.z - at.z) < 10 && row.y > at.y + 4 && Math.hypot(row.x - at.x, row.z - at.z, row.y - at.y) < 38), hook = hooks[index];
    if (hook === undefined) throw new Error('Missing a hook the spawn can see');
    const dx = hook.x - at.x, dz = hook.z - at.z, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(hook.y - at.y - 1.68, Math.hypot(dx, dz));
    const send = (buttons: number, hookTarget?: number): void => {
      client.command({ steer: { keyX: 0, keyY: 0, stickX: 0, stickY: 0 }, yaw, pitch, buttons, ...(hookTarget === undefined ? {} : { hookTarget }) }); client.flush();
      link.pump(); room.tick(); link.pump();
    };
    // a frame's rows leave this client's own player out, so the welcome is the only thing that names it
    const field = (name: Parameters<typeof grappleRow>[1]): number | undefined => client.latest === null ? undefined : client.stateField(client.latest, grappleRow(client.welcome?.player ?? '', name));
    for (let tick = 0; tick < 4; tick++) send(0);
    expect(field('hook')).toBe(NO_HOOK);
    send(NET_BUTTONS.lock, index); send(0);
    expect(field('hook'), 'LOCK names the hook the client picked').toBe(index);
    send(NET_BUTTONS.jump); send(0);
    const seen = new Set<string>();
    let saved: string | undefined;
    for (let tick = 0; tick < 300; tick++) {
      send(0);
      const phase = GRAPPLE_PHASES[field('phase') ?? -1];
      if (phase !== undefined) seen.add(phase);
      saved ??= phase === 'zip' ? serializeSimSnapshot(snapshotSimHostBytes(host)) : undefined;
      if (phase === 'idle' && seen.has('zip')) break;
    }
    expect([...seen].filter(phase => ['fire', 'bite', 'zip'].includes(phase)), 'the bite lands and the zip carries').toEqual(['fire', 'bite', 'zip']);
    expect(Math.hypot(lead.position.x - hook.x, lead.position.z - hook.z), 'the crossing reached its hook').toBeLessThan(Math.hypot(at.x - hook.x, at.z - hook.z) / 2);
    expect(client.closed).toBeNull();
    if (saved === undefined) throw new Error('The zip was never saved');
    back = await openWorld(input, { snapshot: saved, room: true, profiles });
    expect(serializeSimSnapshot(snapshotSimHostBytes(back.host))).toBe(saved);
  } finally { back?.dispose(); room.dispose(); live.dispose(); }
}, 120_000);
