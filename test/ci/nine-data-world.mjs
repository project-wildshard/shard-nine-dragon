// The ordinary product's simulation and the same tape runner native products used.
import { bindShardfileSim, createShardfileSim } from '@wildshard/engine/game/plugin/simulation';
import { planPortalRide } from '@wildshard/engine/game/shardfile/declaredPortalRide';
import { folderHeadlessSections } from '@wildshard/engine/host/headlessSections';
import { createNativeHeadlessTape } from '@wildshard/engine/host/headlessTape';
import { runHeadlessJourney } from '@wildshard/engine/host/headlessJourney';
import { simPlayerCommand } from '@wildshard/engine/host/tickProtocol';
import { restoreSimHost } from '@wildshard/engine/sim/restore';
import { createSimSnapshotSerializer, decodeSimSnapshot, snapshotSimHostBytes } from '@wildshard/engine/sim/snapshot';

const seat = 'actor.player';

export function openNineDataWorld({ shard, assets, product, rapier }, snapshot) {
  const sections = folderHeadlessSections(product);
  const portalRide = planPortalRide(product.section('client/plan').features);
  const effects = [];
  const commands = new Map();
  const ports = { rapier, sections, portalRide, commands: () => commands,
    quest: { fact: (name, actorId) => effects.push({ kind: 'fact', name, actorId }),
      coins: (amount, actorId) => effects.push({ kind: 'coins', amount, actorId }) } };
  const fresh = createShardfileSim(shard, assets, ports);
  let sim = fresh;
  if (snapshot !== undefined) {
    const { level } = fresh.host;
    fresh.dispose();
    restoreSimHost(level, { rapier }, decodeSimSnapshot(snapshot), host => {
      sim = bindShardfileSim(host, shard, assets, { ...ports, restoring: true });
    });
  }
  const { host } = sim;
  const step = input => {
    if (host.scope.disposed) throw new Error('Nine world is disposed');
    effects.length = 0;
    commands.clear();
    let player;
    for (const row of input) {
      if (row.kind === 'player') player = simPlayerCommand(row);
      else if (row.kind === 'script') commands.set(row.actorId, row.value);
      else throw new Error(`Unexpected Nine tape command ${row.kind}`);
    }
    host.step(player === undefined ? undefined : new Map([[seat, player]]));
  };
  const serializer = createSimSnapshotSerializer();
  return { host, step, journey: plan => runHeadlessJourney(host, step, plan), verbTape: createNativeHeadlessTape(host, step, () => effects),
    commit: () => ({ tick: host.state.tick, snapshot: serializer.serialize(snapshotSimHostBytes(host)), effects: [...effects] }),
    dispose() { try { sim.dispose(); } finally { serializer.dispose(); } } };
}
