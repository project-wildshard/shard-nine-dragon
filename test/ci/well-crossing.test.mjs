// J186 SH-nine-4, CI only, never a hook. The course's own crossing on the
// built product by real inputs: walk the square to its south front, hop the
// balustrade onto the Well's south rim (the published escape-rim-hop route),
// and walk the rim. The parapet stops a walk at it and the guard cap above
// stops a jump over it; neither files anything. Then aim, LOCK the ring over
// the humped timber bridge and fire: the Fei Zhua lifts over the cap, lands
// on the bridge and files Over the Well (`nine-dragon-stack.well`) once, and
// the deck walks on. Course, profile and rings are the product's own server
// files; no flag, pose or grapple state is written.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { openWorldAdapter } = await import('@wildshard/engine/host/openWorld');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));

const routes = Object.fromEntries(JSON.parse(readFileSync('test/ci/walk-routes.json', 'utf8'))['nine-dragon-stack'].map(row => [row.name, row]));
const point = ({ x, z, jump, jumpAt }) => ({ x, z, ...(jump === undefined ? {} : { jump }), ...(jumpAt === undefined ? {} : { jumpAt }) });
const walk = (id, points, ticks = 900) => ({ id, ticks, commands: [], route: points.map(point) });
const wait = (id, ticks) => ({ id, ticks, commands: [] });
const facts = row => row.effects.filter(effect => effect.kind === 'fact').map(effect => effect.name);

test('nine-dragon-stack: the Fei Zhua crosses the Well from the south rim and files Over the Well', { timeout: 9_500 }, async () => {
  const started = performance.now(), directory = resolve('out/nine-dragon-stack'), product = await loadHeadlessProduct(directory), shard = product.shardfile;
  const descriptor = outputDescriptor(shard); assert.ok(descriptor, 'The built shard must pass admission');
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  const profile = await product.json('server/grapple-profile.json'), hooks = await product.json('server/hooks.json');
  const { clearance } = profile.course, fact = profile.fact.name;
  assert.equal(clearance?.axis, 'z', 'Nine publishes a well clearance across z');
  const hump = routes['crossing-timber-hump'], hop = routes['escape-rim-hop'], rim = routes['well-rim'].waypoints[1]; // mid-span of the south rim
  const deck = hump.start.y, span = [hump.start, ...hump.waypoints];
  // The ring over the humped timber bridge: the published ring nearest the deck's middle.
  const middle = [(span[0].x + span.at(-1).x) / 2, deck, hump.start.z];
  const ring = hooks.map((row, index) => ({ ...row, index })).sort((a, b) => Math.hypot(a.x - middle[0], a.y - middle[1], a.z - middle[2]) - Math.hypot(b.x - middle[0], b.y - middle[1], b.z - middle[2]))[0];
  assert.ok(ring.z < clearance.plane && ring.y > deck && ring.y < clearance.base && ring.x > span[0].x && ring.x < span.at(-1).x && Math.abs(ring.z - hump.start.z) < 3, `The hump ring hangs over the bridge, below the rim: ${JSON.stringify(ring)}`);
  const lockOn = (prefix, hook, [x, y, z]) => {
    const dx = hook.x - x, dz = hook.z - z, player = { kind: 'player', moveX: 0, moveZ: 0, yaw: Math.atan2(-dx, -dz) };
    const aim = Math.atan2(hook.y - y - profile.headless.eye, Math.hypot(dx, dz));
    return [
      { id: `${prefix}-aim`, ticks: 1, commands: [player, { kind: 'script', actorId: profile.headless.aim, value: aim }] },
      // The page's named LOCK: value 2 + the ring's index (actRoutes lockedHook).
      { id: `${prefix}-lock`, ticks: 1, commands: [{ kind: 'script', actorId: profile.headless.lock, value: hook.index + 2 }] },
      { id: `${prefix}-fire`, ticks: 1, commands: [{ ...player, jump: true }] },
      wait(`${prefix}-fly`, 60), wait(`${prefix}-land`, 240),
    ];
  };
  const runtime = await openWorldAdapter({ shard, assets, product, rapier });
  try {
    const approach = await runtime.verbTape({ version: 1, observe: [], segments: [
      wait('spawn', 1),
      walk('to-south-front', [{ x: shard.spawn.x, z: shard.spawn.z }, hop.start]),
      walk('rim-hop', [hop.start, hop.waypoints[0]], 600),
      walk('along-rim', [hop.waypoints[0], rim]),
      { id: 'push-cap', ticks: 120, commands: [{ kind: 'player', moveX: 0, moveZ: -1, yaw: 0 }] },
      { id: 'jump-cap', ticks: 120, commands: [{ kind: 'player', moveX: 0, moveZ: -1, yaw: 0, jump: true }] },
      walk('back-to-rim', [{ x: rim.x, z: rim.z + 1 }, rim], 600),
      wait('settle', 30),
    ] });
    const at = Object.fromEntries(approach.observations.map(row => [row.id, row]));
    const onRim = ([x, y, z]) => z > clearance.plane && x >= clearance.min && x <= clearance.max && Math.abs(y - clearance.base) < 0.5;
    assert.ok(onRim(at['along-rim'].position) && at['along-rim'].grounded, `The hop lands on the south rim: ${at['along-rim'].position}`);
    const pressed = at['push-cap'].position[2] - clearance.plane;
    assert.ok(pressed > 0 && pressed < 1, `The walk presses up against the parapet: ${at['push-cap'].position}`);
    assert.ok(at['jump-cap'].position[2] > clearance.plane && Math.abs(at['jump-cap'].position[1] - clearance.base) < 8, `The guard cap holds the jump over it: ${at['jump-cap'].position}`);
    assert.ok(at['jump-cap'].peakY > at['push-cap'].peakY + 1, 'The jump at the cap really leaves the rim');
    assert.ok(onRim(at.settle.position) && at.settle.grounded, `Back on the rim: ${at.settle.position}`);
    assert.deepEqual(approach.observations.flatMap(facts), [], 'Walking and jumping at the Well files nothing');

    const still = at.settle.position;
    const crossing = await runtime.verbTape({ version: 1, observe: [], segments: [...lockOn('well', ring, still), walk('hump-walk', [span[2], span[0]])] });
    const step = Object.fromEntries(crossing.observations.map(row => [row.id.replace('well-', ''), row]));
    const { position: landed } = step.land;
    assert.ok(step.fly.peakY > clearance.top, `The Fei Zhua lifts over the well cap: peak ${step.fly.peakY} vs top ${clearance.top}`);
    assert.ok(step.land.grounded && landed[2] < clearance.plane && Math.abs(landed[1] - deck) < 1.5 && landed[0] > span[0].x && landed[0] < span.at(-1).x,
      `The crossing lands on the timber bridge deck (y ${deck}): ${landed}`);
    const nearest = hooks.map((row, index) => ({ index, d: Math.hypot(row.x - landed[0], row.y - landed[1], row.z - landed[2]) })).sort((x, y) => x.d - y.d)[0];
    assert.equal(nearest.index, ring.index, `The crossing lands under the locked ring ${ring.index}, not another: ${landed}`);
    assert.equal(fact, 'nine-dragon-stack.well', 'The grapple profile files Over the Well');
    assert.deepEqual(crossing.observations.map(row => [row.id, facts(row)]).filter(([, names]) => names.length > 0), [['well-land', [fact]]], 'Over the Well is filed once, on landing');
    const deckWalk = step['hump-walk'];
    assert.ok(deckWalk.grounded && Math.abs(deckWalk.position[1] - deck) < 0.5 && deckWalk.position[0] < landed[0] - 5, `The bridge deck walks on: ${deckWalk.position}`);
    console.log(`well-crossing ${JSON.stringify({ ring: ring.index, landed: landed.map(v => +v.toFixed(2)), peak: +step.fly.peakY.toFixed(2), ticks: approach.ticks + crossing.ticks, elapsedMs: Math.round(performance.now() - started) })}`);
  } finally { await runtime.dispose(); }
});
