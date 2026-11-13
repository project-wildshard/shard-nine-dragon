// The byte helpers Nine Dragon's browser bakers share (bake-glyphs.mjs, bake-sign-atlas.mjs, bake/bake-nine-decal-atlas.mjs).
// SA6: they used to import a repo-root scripts/bake-output.mjs that did not come over in the lift, so they could not run and
// reached outside the shard. They are the shard's own now; checks never mutate the output tree.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { isAnyArrayBuffer } from 'node:util/types';

export const outputHash = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Reject byte views before JSON.stringify silently turns them into numeric objects: bytes go in their own file. */
function assertJsonRows(value) {
  const pending = [value], seen = new WeakSet();
  while (pending.length > 0) {
    const row = pending.pop();
    if (row === null || typeof row !== 'object') continue;
    if (isAnyArrayBuffer(row) || ArrayBuffer.isView(row) || (Reflect.get(row, 'type') === 'Buffer' && Array.isArray(Reflect.get(row, 'data'))))
      throw new Error('BINARY-JSON: byte values require a separate binary file');
    if (seen.has(row)) continue; seen.add(row);
    for (const next of Object.values(row)) pending.push(next);
  }
}

export const jsonBytes = (value, indent = 2) => { assertJsonRows(value); return Buffer.from(`${JSON.stringify(value, null, indent)}\n`); };

// No binary in JSON (G649): a base64 run or a data: URI belongs in its own file; this shard has no allowance.
const BINARY_TEXT = /^data:|[A-Za-z0-9+/]{256,}={0,2}$/u;

/** Every JSON write stays inside the repo and holds rows, never bytes. */
function guardJson(root, path, buf) {
  if (!path.endsWith('.json')) return;
  const local = relative(root, resolve(root, path));
  if (isAbsolute(local) || local.startsWith('../')) throw new Error(`BINARY-JSON ${path}: output escapes its producer`);
  const pending = [JSON.parse(buf.toString('utf8'))];
  while (pending.length > 0) {
    const row = pending.pop();
    if (typeof row === 'string' && BINARY_TEXT.test(row)) throw new Error(`BINARY-JSON ${local}: bytes require a separate binary file`);
    if (row !== null && typeof row === 'object') pending.push(...Object.values(row));
  }
}

/** Write only changed bytes; with `check`, report them as stale and fail instead. */
export function byteWriter(check, label, root = process.cwd()) {
  let changed = 0;
  const mismatch = (path) => { changed++; console.log(`${label}: ${check ? 'STALE' : 'changed'} ${relative(process.cwd(), path)}`); };
  return {
    put(path, bytes) {
      const buf = Buffer.from(bytes); guardJson(root, path, buf);
      if (existsSync(path) && readFileSync(path).equals(buf)) return;
      mismatch(path);
      if (!check) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buf); }
    },
    remove(path) {
      if (!existsSync(path)) return;
      mismatch(path);
      if (!check) rmSync(path);
    },
    finish() {
      if (changed > 0 && check) process.exitCode = 1;
      return changed;
    },
  };
}

/** A native authoring page POSTs its bytes to a routed URL; bounded request bodies, never encoded JSON. */
export async function browserBakeBytes(page, { maxBytes = 64_000_000, maxFiles = 64 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(maxFiles) || maxFiles < 1)
    throw new Error('Invalid browser bake byte limits');
  const url = `https://binary-bake.invalid/${randomUUID()}/`, pattern = `${url}*`;
  const files = new Map(), received = new Set();
  let total = 0, closed = false;
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' };
  const handler = async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    const id = request.url().slice(url.length), bytes = request.postDataBuffer();
    if (closed || request.method() !== 'POST' || !request.url().startsWith(url)
      || !/^[a-z0-9][a-z0-9._-]{0,80}$/u.test(id) || received.has(id)
      || bytes === null || bytes.byteLength === 0 || total + bytes.byteLength > maxBytes || received.size >= maxFiles) {
      await route.fulfill({ status: 400, headers, body: 'Invalid or over-budget bake bytes' }); return;
    }
    files.set(id, new Uint8Array(bytes)); received.add(id); total += bytes.byteLength;
    await route.fulfill({ status: 204, headers });
  };
  await page.route(pattern, handler);
  return {
    url,
    take(id) {
      const bytes = files.get(id);
      if (closed || bytes === undefined) throw new Error(`Missing browser bake bytes: ${id}`);
      files.delete(id); return bytes;
    },
    async dispose() {
      closed = true; files.clear(); received.clear();
      await page.unroute(pattern, handler);
    },
  };
}
