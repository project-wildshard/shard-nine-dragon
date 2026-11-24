// SH-ALL-13 (J97): a darwin-only compare is how Pine and Far Reach drifted
// unseen. The product proof's checkpoint after its 241-tick walk is hashed
// and compared with a recorded baseline for this platform, so a Linux CI run
// compares too. Rapier and float math may differ by platform, so each
// platform keeps its own baseline. A missing entry fails rather than skips.
//
// Re-record after a content change, or an engine change that moves the digest, on each platform:
//   CHECKPOINT_BASELINE=record node --test test/ci/product-play.test.mjs
// Linux values come from the CI failure message, which prints the entry.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = 'test/ci/checkpoint-baselines.json';
export const PLATFORM = `${process.platform}-${process.arch}`;
const RECORD = process.env.CHECKPOINT_BASELINE === 'record';

function bytesOf(value) {
  if (typeof value === 'string') return Buffer.from(value);
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  return Buffer.from(JSON.stringify(value));
}

/** The sha256 of a checkpoint's opaque snapshot: never its layout, only its bytes. */
export function snapshotDigest(snapshot) {
  return createHash('sha256').update(bytesOf(snapshot)).digest('hex');
}

function read() {
  return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
}

/** `0.1.80-next.be7e944e` as [0, 1, 80, 0] and `0.1.80` as [0, 1, 80, 1]: a prerelease sorts before its release. */
function engineOrder(engine) {
  const [core = '', pre] = engine.split('-');
  return [...core.split('.').map(Number), pre === undefined ? 1 : 0];
}
/** This platform's digest for `slug` on the newest engine that recorded one. */
function newestRecorded(all, slug) {
  const rows = Object.entries(all).flatMap(([key, row]) => {
    const [engine, platform] = key.split(' ');
    return platform === PLATFORM && row[slug] !== undefined ? [{ order: engineOrder(engine), digest: row[slug] }] : [];
  });
  rows.sort((a, b) => { for (let i = 0; i < 4; i++) if (a.order[i] !== b.order[i]) return (a.order[i] ?? 0) - (b.order[i] ?? 0); return 0; });
  return rows.at(-1)?.digest;
}

/** Throws unless `digest` is this platform's recorded checkpoint for `slug` on `engine`. */
export function assertCheckpointBaseline(slug, digest, engine) {
  const all = read(), key = `${engine} ${PLATFORM}`;
  if (RECORD) {
    // Record mode rewrites this platform's row for this engine; other rows stay.
    all[key] = { ...all[key], [slug]: digest };
    writeFileSync(FILE, `${JSON.stringify(Object.fromEntries(Object.entries(all).sort()), null, 2)}\n`);
    console.log(`checkpoint baseline recorded: ${key} ${slug} ${digest}`);
    return;
  }
  const want = all[key]?.[slug];
  if (want === digest) return;
  // SHARD-COMPAT PR6: a checkpoint is keyed to the shard's content, not the engine version. An engine with no row of its
  // own passes when the walk ends where it ended on the newest engine recorded for this platform (Nine, Sky Reach,
  // Driftwood and Pine read the same digest from 0.1.65 to 0.1.80); a different digest still fails and is recorded.
  if (want === undefined && newestRecorded(all, slug) === digest) {
    console.log(`checkpoint baseline: ${slug} on ${key} matches the newest recorded engine's digest`);
    return;
  }
  const entry = JSON.stringify({ [key]: { [slug]: digest } });
  throw new Error(want === undefined
    ? `${slug}: no checkpoint baseline for ${key} in ${FILE}; record it (CHECKPOINT_BASELINE=record) or add ${entry}`
    : `${slug}: the checkpoint after the walk drifted on ${key}: recorded ${want}, now ${digest}. If the change is meant, record ${entry}`);
}
