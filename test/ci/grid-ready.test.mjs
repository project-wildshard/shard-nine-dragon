// J186 SH-nine-2, CI only, never a hook. The built Nine output admits as a
// cell of the pinned engine's shipped grid: its catalogue names Nine, a
// prefetched world is not ready until runtime admission says so, the owner
// enters on the cell's own seat and walks by real input, a refused save keeps
// the world, a durable checkpoint lets it unload, a left world stays frozen,
// and a fresh residency restores the saved pose and regional continuation
// (tick, clock, rng, flags, adapters) and walks on. Only the engine's public
// grid and trusted-runtime exports drive it.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { openWorld } = await import('@wildshard/engine/host/openWorld');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const { GridAssembly } = await import('@wildshard/engine/game/grid/assembly');
const { GridSimulation } = await import('@wildshard/engine/game/grid/simulation');
const { leadPlayer } = await import('@wildshard/engine/sim/leadPlayer');
const { regionalContinuation } = await import('@wildshard/engine/sim/snapshot');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));

const SLUG = 'nine-dragon-stack';
const pose = host => { const { position: { x, y, z }, yaw } = leadPlayer(host); return [x, y, z, yaw]; };
const same = (a, b) => a.every((value, i) => Math.abs(value - b[i]) < 1e-9);
const finite = host => [...host.players.values(), ...host.entities.values()].every(({ position: p }) => [p.x, p.y, p.z].every(Number.isFinite));

test('nine-dragon-stack: admits on the shipped grid, checkpoints, unloads frozen and restores', { timeout: 9_500 }, async () => {
  const started = performance.now(), directory = resolve(`out/${SLUG}`), product = await loadHeadlessProduct(directory), shard = product.shardfile;
  const descriptor = outputDescriptor(shard); assert.ok(descriptor, 'The built shard must pass admission');
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  const input = { shard, assets, product, rapier };
  // The pinned engine's shipped singleplayer catalogue, not a grid made up for this test.
  const assembly = new GridAssembly({ developer: false, devserver: false });
  const cell = assembly.cells.find(row => row.slug === SLUG); assert.ok(cell, 'The shipped grid must name Nine');
  const { instance } = cell;
  // The highway is a second Nine world standing in for the road (the grid server's road is not exported); it only carries the owner between frames.
  const highway = (await openWorld(input, { room: true })).resident;
  let resident, admitted = false, durable = false, loads = 0;
  const saved = new Map();
  const grid = new GridSimulation(assembly, { highway: { host: highway.host, dispose: () => { highway.dispose(); } },
    admitted: () => admitted, read: id => saved.get(id), save: (id, snapshot) => { if (!durable) return false; saved.set(id, structuredClone(snapshot)); return true; },
    load: async (_cell, snapshot) => { loads++; const own = (await openWorld(input, { room: true, snapshot })).resident; resident = own; return { host: own.host, dispose: () => { own.dispose(); } }; } });
  // Real input on the resident's own step, as the grid server steps an occupied cell.
  const walk = (from, ticks) => {
    for (let tick = 0; tick < ticks; tick++) resident.step([{ kind: 'player', moveX: 0, moveZ: -1, yaw: from[3] }]);
    for (let tick = 0; tick < 30; tick++) resident.step([]);
    assert.ok(finite(resident.host), 'The walked world stays finite');
    const to = pose(resident.host);
    assert.ok(Math.hypot(to[0] - from[0], to[2] - from[2]) > 1, `Real input moves the owner: ${from} -> ${to}`);
    return to;
  };
  try {
    assert.equal(grid.ready(instance), false, 'An unloaded cell is not ready');
    await grid.prefetch([instance]);
    assert.equal(loads, 1); assert.equal(grid.ready(instance), false, 'Physics alone cannot satisfy runtime admission');
    const fenced = await grid.prepare(null, instance);
    assert.throws(() => { fenced.commit(); }, /unready/u, 'A crossing into an unadmitted cell is refused'); fenced.cancel();
    assert.equal(grid.current(), null, 'The refused crossing leaves the owner on the road');
    admitted = true; assert.equal(grid.ready(instance), true, 'An admitted cell is ready');
    const seat = pose(resident.host), admittedState = regionalContinuation(resident.host);
    await grid.enter(instance);
    assert.equal(grid.current(), instance, 'The owner stands in the Nine cell');
    const feet = grid.worldFeet(), expected = assembly.world({ x: seat[0], y: seat[1], z: seat[2] }, cell);
    assert.ok(same([feet.x, feet.y, feet.z], [expected.x, expected.y, expected.z]), `Entering takes the seat the cell holds: ${JSON.stringify(feet)}`);
    const walked = walk(seat, 60);
    assert.equal(grid.checkpoint(instance), false, 'A refused save is not a checkpoint'); assert.equal(saved.size, 0);
    durable = true; assert.equal(grid.checkpoint(instance), true, 'A durable checkpoint is admitted'); assert.equal(saved.size, 1);
    const tick = resident.host.state.tick, regional = regionalContinuation(resident.host), left = resident.host;
    assert.notEqual(regional, admittedState, 'The walk changed the regional continuation');
    (await grid.prepare(instance, null)).commit();
    assert.equal(grid.current(), null, 'The owner left for the road');
    for (let i = 0; i < 5; i++) grid.step();
    assert.ok(finite(highway.host), 'The road steps');
    assert.equal(left.state.tick, tick, 'A left world stays frozen'); assert.equal(regionalContinuation(left), regional, 'Its continuation stays frozen');
    durable = false;
    assert.equal(grid.unload(instance), false, 'A refused save keeps the world'); assert.equal(grid.ready(instance), true); assert.equal(saved.size, 1);
    durable = true;
    assert.equal(grid.unload(instance), true, 'A checkpointed frozen world unloads'); assert.equal(grid.ready(instance), false);
    await grid.prefetch([instance]);
    assert.equal(loads, 2, 'Restore builds a fresh residency'); assert.notEqual(resident.host, left);
    assert.equal(resident.host.state.tick, tick, 'The restored world keeps its tick');
    assert.deepEqual(pose(resident.host), walked, 'The restored seat keeps the walked pose');
    assert.equal(regionalContinuation(resident.host), regional, 'The restored world keeps its regional continuation');
    (await grid.prepare(null, instance)).commit();
    assert.equal(grid.current(), instance, 'The owner re-enters the restored cell');
    walk(pose(resident.host), 30);
    assert.equal(resident.host.state.tick, tick + 60, 'The restored world plays on');
    console.log(`grid-ready ${JSON.stringify({ instance, cell: cell.cell, loads, tick, elapsedMs: Math.round(performance.now() - started) })}`);
  } finally { grid.dispose(); }
  assert.deepEqual(grid.disposalIssues(), [], 'Every residency disposes cleanly');
});
