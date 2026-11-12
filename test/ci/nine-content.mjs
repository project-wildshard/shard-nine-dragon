import assert from 'node:assert/strict';

// Choose an actual published ring from the actual spawn; no body, lock or
// landing is manufactured. Public tape observations describe the result.
// `observe` repeats the caller's own tape owners: a runtime pins them on its first tape.
export default async function grapple(product, runtime, observe = []) {
  const initial = await runtime.verbTape({ version: 1, observe, segments: [{ id: 'feet', ticks: 1, commands: [] }] });
  const [x, y, z] = initial.observations[0].position;
  const hooks = await product.json('server/hooks.json'), profile = await product.json('server/grapple-profile.json');
  const hook = hooks.find(row => row.x > x + 15 && Math.abs(row.z - z) < 10 && row.y > y + 4 && Math.hypot(row.x - x, row.z - z, row.y - y) < 38);
  assert.ok(hook, 'Nine must publish a reachable bridge-side grapple ring');
  const dx = hook.x - x, dz = hook.z - z, yaw = Math.atan2(-dx, -dz);
  const aim = Math.atan2(hook.y - y - profile.headless.eye, Math.hypot(dx, dz));
  const player = { kind: 'player', moveX: 0, moveZ: 0, yaw };
  const report = await runtime.verbTape({ version: 1, observe, segments: [
    { id: 'aim', ticks: 1, commands: [player, { kind: 'script', actorId: profile.headless.aim, value: aim }] },
    { id: 'lock', ticks: 1, commands: [{ kind: 'script', actorId: profile.headless.lock, value: 1 }] },
    { id: 'fire', ticks: 1, commands: [{ ...player, jump: true }] },
    { id: 'bite', ticks: 24, commands: [] },
    { id: 'zip', ticks: 36, commands: [] },
    { id: 'land', ticks: 180, commands: [] },
  ] });
  const peak = Math.max(...report.observations.map(row => row.peakY)), land = report.observations.at(-1);
  assert.ok(peak > hook.y - 3 && peak < hook.y, 'LOCK and ZIP must rise beneath the actual ring');
  assert.equal(land.grounded, true, 'The real grapple must land on solid geometry');
  assert.ok(Math.hypot(land.position[0] - x, land.position[2] - z) > 10, 'A successful grapple must carry the player');
}
