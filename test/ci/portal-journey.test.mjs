// J186 SH-nine-1, CI only, never a hook. The built product's portal ride and
// grapple on real inputs: walk the published square route into the way-out
// ring, ride the fade to the first road deck, step off the deck ring and
// back in, ride home to the lantern square, then aim, LOCK and ZIP to the
// published bridge-side ring (nine-content.mjs). Only walked routes and the
// page's grapple inputs drive it; the ride is read from its own published
// continuation and the effects it emits. No flag, pose or ride state is written.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { createTrustedHeadlessAdapter } = await import('@wildshard/engine/host/headlessRuntime');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));
const { default: grapple } = await import('./nine-content.mjs');

// The ride's fixed step (data/headlessAssembly.json constants.portalStep); its continuation is the public observation.
const RIDE = 'nine-dragon-stack.portals';
const walk = (id, points, ticks = 1200) => ({ id, ticks, commands: [], route: points.map(([x, z]) => ({ x, z })) });
const wait = (id, ticks) => ({ id, ticks, commands: [] });
const near = (at, [x, y, z], limit = 1.5) => Math.hypot(at[0] - x, at[1] - y, at[2] - z) < limit;

test('nine-dragon-stack: portal ride out and home, then hook, LOCK and ZIP on real inputs', { timeout: 9_500 }, async () => {
  const started = performance.now(), directory = resolve('out/nine-dragon-stack'), product = await loadHeadlessProduct(directory), shard = product.shardfile;
  const descriptor = outputDescriptor(shard); assert.ok(descriptor, 'The built shard must pass admission');
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  // Before any road is entered the way-out ring binds the first declared road (walkInPortalRide.ts exitFor).
  const { edge, portal } = shard.entryways.find(row => row.portal !== undefined); assert.ok(portal, 'Nine must publish a portal link');
  const { landings } = await product.json('server/portal-ride.json');
  const landing = landings.find(row => row.node === portal.destination.id);
  assert.ok(landing, 'The square arrival must report a landing fact');
  // Off the deck ring and back: five metres along the road's heading, out of the walk-in volume.
  const [rx, ry, rz] = portal.road.at, out = [rx - 5 * Math.sin(portal.road.yaw), rz - 5 * Math.cos(portal.road.yaw)];
  const runtime = await createTrustedHeadlessAdapter({ shard, assets, product, rapier });
  try {
    const report = await runtime.verbTape({ version: 1, observe: [RIDE], segments: [
      wait('spawn', 1),
      walk('walk-to-ring', portal.route.map(([x, , z]) => [x, z])),
      wait('ride-out', 90),
      walk('step-off-ring', [[rx, rz], out]),
      walk('step-back-in', [out, [rx, rz]]),
      wait('ride-home', 90),
    ] });
    const at = Object.fromEntries(report.observations.map(row => [row.id, { ...row, ride: JSON.parse(row.adapters.find(owner => owner.id === RIDE).state).ride }]));
    const transfers = id => at[id].ride.rides.map(row => `${row.from}>${row.to}`);
    const facts = id => at[id].effects.filter(row => row.kind === 'fact').map(row => row.name);
    assert.ok(near(at.spawn.position, portal.destination.at), `Spawn stands on the square arrival: ${at.spawn.position}`);
    assert.deepEqual(transfers('walk-to-ring'), [], 'Walking the square route must not ride before the ring');
    assert.deepEqual(transfers('ride-out'), [`${portal.exit.id}>${portal.road.id}`], 'The way-out ring rides to the road deck');
    assert.equal(at['ride-out'].ride.entered, null, 'The way out does not enter a road');
    assert.ok(near(at['ride-out'].position, portal.road.at) && at['ride-out'].grounded, `The ride lands on the ${edge} deck: ${at['ride-out'].position}`);
    assert.deepEqual(transfers('step-off-ring'), transfers('ride-out'), 'Standing in the arrival ring must not ride again');
    assert.ok(!near(at['step-off-ring'].position, portal.road.at, 4) && at['step-off-ring'].position[1] > ry - 0.5, 'Stepping off stays on the deck');
    assert.deepEqual(transfers('ride-home'), [`${portal.exit.id}>${portal.road.id}`, `${portal.road.id}>${portal.destination.id}`], 'Walking back into the deck ring rides home');
    assert.equal(at['ride-home'].ride.entered, edge, `The ride home enters by the ${edge} road`);
    assert.deepEqual(at['ride-home'].ride.refused, [], 'No transfer is refused');
    assert.deepEqual([...Object.keys(at)].filter(id => id !== 'ride-home').flatMap(facts), [], 'Only a landing reports its fact');
    assert.deepEqual(facts('ride-home'), [landing.fact], 'The landing reports the lantern square');
    assert.ok(near(at['ride-home'].position, portal.destination.at) && at['ride-home'].grounded, `The ride home lands on the square arrival: ${at['ride-home'].position}`);
    // From the arrival the published hook, aim, LOCK and ZIP carry the player and land on solid geometry.
    await grapple(product, runtime, [RIDE]);
    console.log(`portal-journey ${JSON.stringify({ edge, rides: transfers('ride-home'), ticks: at['ride-home'].tick, elapsedMs: Math.round(performance.now() - started) })}`);
  } finally { await runtime.dispose(); }
});
