// J186: actual built products, real player input and authored route data.
// Explicit CI proof only; no teleports, forced quest flags or fake host.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
const { questSource } = await import('./quest-source.mjs');

const { loadHeadlessFolder } = await import('@wildshard/engine/host/headlessFolder');
const { openNineDataWorld } = await import('./nine-data-world.mjs');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const { manifestFolders, builtShardFolders } = await import('@wildshard/engine/scripts/shard-outputs.mjs');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));
const routes = JSON.parse(readFileSync('test/ci/walk-routes.json', 'utf8'));
const products = builtShardFolders(process.cwd(), manifestFolders(process.cwd())).map(row => row.slug).sort();
assert.ok(products.length);
assert.deepEqual(readdirSync('out', {withFileTypes:true}).filter(row => row.isDirectory() && !row.name.startsWith('.') && row.name !== 'tars').map(row=>row.name).sort(), products);

function routeFor(slug, spawn) {
  if (routes[slug] === 'spawn-square') return {name:'spawn-square',points:[{x:spawn.x,z:spawn.z},{x:spawn.x+5,z:spawn.z},{x:spawn.x+5,z:spawn.z+5},{x:spawn.x,z:spawn.z+5}]};
  const candidates = routes[slug].filter(row => row.inside === undefined && row.start.hover !== true);
  candidates.sort((a,b)=>Math.hypot(a.start.x-spawn.x,a.start.z-spawn.z)-Math.hypot(b.start.x-spawn.x,b.start.z-spawn.z));
  const nearest = candidates[0]; assert.ok(nearest, `No authored spawn route for ${slug}`);
  return {name:nearest.name,points:[{x:nearest.start.x,z:nearest.start.z},...nearest.waypoints]};
}

for (const slug of products) test(`${slug}: enters and walks 1800 actual authored-route ticks`, {timeout:9500}, async () => {
  const started = performance.now(), directory = resolve('out', slug), product = await loadHeadlessFolder(directory), shard = product.shardfile;
  assert.deepEqual(shard.quests,questSource(slug),'The real product must preserve its authored quest inventory');
  const descriptor = outputDescriptor(shard); assert.ok(descriptor);
  assert.equal(shard.runtime, null);
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file,shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file=>[file.commons === true ? `commons:${file.hash}` : file.hash,readFileSync(join(directory,file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  let runtime = openNineDataWorld({shard,assets,product,rapier});
  try {
    const route = routes[slug].find(row => row.name === 'stair-street');
    assert.ok(route, 'The authored stair-street route is available');
    const { observations: [climbed] } = await runtime.verbTape({ version: 1, observe: [], segments: [
      { id: 'stair-street', ticks: 1800, commands: [], route: [shard.spawn, route.start, ...route.waypoints].map(({ x, z }) => ({ x, z })) },
    ] });
    assert.ok(climbed.grounded && Math.abs(climbed.position[1] - route.expect.y) < 0.5, `The stair-street lands at y=${route.expect.y}: ${climbed.position}`);
    const nearby = routeFor(slug, shard.spawn);
    runtime.dispose();
    runtime = openNineDataWorld({ shard, assets, product, rapier });
    const report = await runtime.journey({ ticks: 1800, points: nearby.points });
    assert.equal(report.ticks,1800); assert.equal(report.settledTicks,60);
    assert.ok(report.distance>0); assert.ok(report.visited>1, `The real journey must reach multiple route points: ${JSON.stringify(report)}`);
    assert.equal(report.final.grounded,true); assert.ok(report.final.position.every(Number.isFinite));
    console.log(`owned-journey ${slug} ${JSON.stringify({route:nearby.name,climbed:climbed.position,...report,elapsedMs:performance.now()-started})}`);
  } finally { await runtime.dispose(); }
  await assert.rejects(async () => runtime.step([]));
  assert.ok(performance.now()-started<9500,'The complete journey must remain under the quick proof budget');
});
