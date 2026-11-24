// SHARD-COMPAT PR6: an engine or SDK bump needs no shard edit beyond the version. A bump that leaves a checkpoint's
// bytes alone needs no new baseline row, and ci21-source's candidate follows the installed engine.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { assertCheckpointBaseline, PLATFORM } from './checkpoint-baseline.mjs';

const ROOT = process.cwd();
const recorded = JSON.parse(readFileSync(join(ROOT, 'test/ci/checkpoint-baselines.json'), 'utf8'));

/** Runs `check` in a scratch checkout whose baseline file holds `rows`; returns the rows it leaves. */
function withRows(rows, check) {
  mkdirSync(join(ROOT, 'tmp'), { recursive: true });
  const dir = mkdtempSync(join(ROOT, 'tmp/bump-only-'));
  mkdirSync(join(dir, 'test/ci'), { recursive: true });
  const file = join(dir, 'test/ci/checkpoint-baselines.json');
  writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
  try {
    process.chdir(dir);
    check();
    return JSON.parse(readFileSync(file, 'utf8'));
  } finally { process.chdir(ROOT); rmSync(dir, { recursive: true, force: true }); }
}

test('no workflow names a fixed default engine commit', () => {
  for (const file of ['ci.yml']) {
    const path = resolve(ROOT, '.github/workflows', file);
    if (!existsSync(path)) continue;
    assert.doesNotMatch(readFileSync(path, 'utf8'), /inputs\.engine \|\| '[0-9a-f]{40}'/u, `${file}: default the candidate to scripts/installed-engine.mjs`);
  }
});

const A = 'a'.repeat(64), C = 'c'.repeat(64);
const rows = {
  [`0.1.74-next.d6e6bc6b ${PLATFORM}`]: { shard: C },
  [`0.1.76-next.f3b1d4c7 ${PLATFORM}`]: { shard: A },
};

test('a version bump with unchanged bytes passes and writes no row', () => {
  const after = withRows(rows, () => {
    assertCheckpointBaseline('shard', A, '0.1.80-next.be7e944e');
    assertCheckpointBaseline('shard', A, '0.1.81');
  });
  assert.deepEqual(after, rows);
});

test('changed bytes still fail: an older row, a newer row or new bytes', () => {
  withRows(rows, () => {
    assert.throws(() => assertCheckpointBaseline('shard', C, '0.1.80-next.be7e944e'), /no checkpoint baseline|drifted/u);
    assert.throws(() => assertCheckpointBaseline('shard', 'e'.repeat(64), '0.1.80-next.be7e944e'), /no checkpoint baseline|drifted/u);
    assert.throws(() => assertCheckpointBaseline('other', A, '0.1.80-next.be7e944e'), /no checkpoint baseline/u);
    assert.throws(() => assertCheckpointBaseline('shard', A, '0.1.74-next.d6e6bc6b'), /drifted/u, 'an engine with its own row is exact');
  });
});

test("an engine that makes platforms agree passes on another platform's bytes from the same engine on", () => {
  // Driftwood on 0.1.80: darwin-arm64 walks to linux-x64's digest.
  const OTHER = PLATFORM === 'linux-x64' ? 'darwin-arm64' : 'linux-x64';
  const L = 'f'.repeat(64), M = 'e'.repeat(64);
  const both = { ...rows, [`0.1.74-next.d6e6bc6b ${OTHER}`]: { shard: M }, [`0.1.76-next.f3b1d4c7 ${OTHER}`]: { shard: L } };
  const after = withRows(both, () => assertCheckpointBaseline('shard', L, '0.1.80-next.be7e944e'));
  assert.deepEqual(after, both, 'no row written');
  withRows(both, () => assert.throws(() => assertCheckpointBaseline('shard', M, '0.1.80-next.be7e944e'), /no checkpoint baseline/u, "another platform's older engine does not count"));
});

test("this shard's recorded checkpoints hold on the next engine with no new row", () => {
  const slugs = new Set(Object.entries(recorded).filter(([row]) => row.endsWith(` ${PLATFORM}`)).flatMap(([, digests]) => Object.keys(digests)));
  for (const slug of slugs) {
    // The newest recorded engine's bytes on this platform are what the next engine must match.
    const newest = Object.entries(recorded).filter(([row, digests]) => row.endsWith(` ${PLATFORM}`) && digests[slug] !== undefined)
      .map(([row, digests]) => ({ version: row.split(' ')[0], digest: digests[slug] }))
      .sort((a, b) => compare(a.version, b.version)).at(-1);
    const after = withRows(recorded, () => assertCheckpointBaseline(slug, newest.digest, `999.0.0-next.${'0'.repeat(8)}`));
    assert.deepEqual(after, recorded, `${slug} needs no row on the next engine`);
  }
});

function compare(a, b) {
  const order = text => { const [core, pre] = text.split('-'); return [...core.split('.').map(Number), pre === undefined ? 1 : 0]; };
  const [x, y] = [order(a), order(b)];
  for (let index = 0; index < 4; index++) if (x[index] !== y[index]) return x[index] - y[index];
  return 0;
}
