// oxlint-disable-next-line import/no-nodejs-modules -- The room runs the shipped product bytes and physics module.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { NetClient } from '@wildshard/sdk/internal/engine/net/client';
import { NetRoom } from '@wildshard/sdk/internal/engine/net/room';
import { SimNetWorld } from '@wildshard/sdk/internal/engine/net/simWorld';
import { NET_BUTTONS } from '@wildshard/sdk/internal/engine/input/netButtons';
import { loadRapier } from '@wildshard/sdk/headless/physics/rapier';
import { leadPlayer } from '@wildshard/sdk/internal/engine/sim/leadPlayer';
import { serializeSimSnapshot, snapshotSimHostBytes } from '@wildshard/sdk/headless/sim/snapshot';
import { directLoopback } from '../fixtures/netLoopback';
import { hasNativeAssembly } from '@wildshard/sdk/internal/engine/game/shardfile/nativeAssembly';
import { GRAPPLE_PHASES, grappleRow, NO_HOOK } from '../fixtures/grapple-wire';
import { outputDescriptor } from '@wildshard/sdk/headless/game/shardfile/outputDescriptor';
import type { CreatureRewardState } from '@wildshard/sdk/internal/engine/game/saves';
import { openWorld } from '@wildshard/sdk/internal/engine/host/openWorld';
import { nineRuntimeInput } from '../fixtures/nine-product-session';
import { nineNativeConstants } from '../fixtures/nine-native-constants';

// OF21: the ordinary product keeps its pieces, hooks and claw path over the wire.

async function shipped() {
  const input = await nineRuntimeInput(), { product, shard } = input;
  const descriptor = outputDescriptor(shard);
  if (descriptor === undefined) throw new Error('Missing admitted Nine output');
  return { product, shard, index: descriptor.index, input };
}
test('the ordinary product keeps the shipped rope, landing and collision declarations', async () => {
  const { product, shard, index } = await shipped(), constants = await nineNativeConstants();
  expect(shard.runtime).toBeNull();
  expect(hasNativeAssembly(product)).toBe(false);
  expect(index.admission.server ?? []).toEqual([]);
  const grapple = shard.modes?.grapple?.find(row => row.profile !== undefined);
  const { id: _id, course: { mode: _mode, ...course }, ...profile } = constants.grappleProfile;
  expect(grapple?.profile).toEqual({ ...profile, course });
  expect(grapple?.hooks).toEqual(constants.hooks);
  expect(shard.props?.colliders.find(row => row.id === 'nds-grapple-guard')?.shapes).toHaveLength(2);
  expect(shard.props?.colliders.find(row => row.id === 'nds-banyan.paifang')?.shapes[0]).toMatchObject({ kind: 'hull', surface: 'stone' });
  const portal = product.section('client/plan').features.find(row => row.kind === 'portal.ride');
  expect(portal).toMatchObject({ kind: 'portal.ride', rows: { director: constants.portalRide.director, landings: constants.portalRide.landings } });
}, 120_000);

test('a client locks a hook and rides it over the wire, and the save holds the crossing', async () => {
  const profilesById = new Map<string, CreatureRewardState>();
  const profiles = { read: (id: string) => profilesById.get(id) ?? null, write: (id: string, state: CreatureRewardState) => { profilesById.set(id, structuredClone(state)); return true; } };
  const { input, shard } = await shipped(), hooks = shard.modes?.grapple?.find(row => row.profile !== undefined)?.hooks;
  if (hooks === undefined) throw new Error('Missing declared grapple rings');
  const live = await openWorld(input, { room: true, profiles }), { host } = live, lead = leadPlayer(host);
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
