// SH-ALL-13 (J97): a darwin-only compare is how Pine and Far Reach drifted
// unseen. The product proof's checkpoint after its 241-tick walk is hashed
// and compared with a recorded baseline for this platform, so a Linux CI run
// compares too. Rapier and float math may differ by platform, so each
// platform keeps its own baseline. A missing entry fails rather than skips.
//
// Re-record after an engine or content change, on each platform:
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
  const entry = JSON.stringify({ [key]: { [slug]: digest } });
  throw new Error(want === undefined
    ? `${slug}: no checkpoint baseline for ${key} in ${FILE}; record it (CHECKPOINT_BASELINE=record) or add ${entry}`
    : `${slug}: the checkpoint after the walk drifted on ${key}: recorded ${want}, now ${digest}. If the change is meant, record ${entry}`);
}
