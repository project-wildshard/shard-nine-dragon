#!/usr/bin/env node
// NINE-DRAGON-BENCHMAX (meta docs/plans/NINE-DRAGON-BENCHMAX-PLAN.md, NB8), the phone-tier triangle budget: the
// first-person rig's phone copy. The engine's phone tier fetches `name.phone.glb` in place of `name.glb` wherever the build
// has one (engine src/client/engine/boot/bytes.ts `phoneUrl`), so this writes `fp-rig.phone.glb` beside the authored rig
// and the desktop keeps the original bytes.
//
// Each mesh keeps every vertex attribute, skin, node and clip: only its index buffer is simplified (meshoptimizer, the
// surface held within ERROR_MM of the original in the rig's own metres) and its unused vertices dropped. The error is
// measured in metres through each mesh's bind pose (skinned) or world matrix (rigid), so a quantized mesh's [-1, 1]
// units never stand in for metres. Deterministic: the same rig and meshoptimizer give the same bytes.
//
//   node scripts/nine-phone-rig.mjs [--check]     (pnpm build:shards runs it before the build)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const ROOT = join(import.meta.dirname, '..');
/** the authored rig, and the phone copy beside it (gitignored: `pnpm build:shards` writes it before the build) */
export const SOURCE = join(ROOT, 'public/assets/nine-dragon/viewmodel/fp-rig.glb');
const TARGET = join(ROOT, 'public/assets/nine-dragon/viewmodel/fp-rig.phone.glb');
/** the surface's largest move, in millimetres. A pixel of the phone frame (portrait, 78° FOV over ~1750 buffer px) is
 *  ~0.3 mm at the glove's 0.3 m from the eye and ~0.6 mm at the gauntlet and blade; at 1 mm the 402×874 captures of the
 *  spawn view (Chromium and WebKit) show no difference and the rig keeps ~30 % of its triangles. */
export const ERROR_MM = 1.0;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

/** column-major 4×4 product */
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
/** a matrix's uniform scale (the cube root of its 3×3 determinant) */
function scaleOf(m) {
  return Math.cbrt(Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5])));
}
/** metres per unit of the mesh's own positions: a skinned mesh through its joints' bind pose (glTF skinning ignores its
 *  node matrix), a rigid one through its world matrix; the smallest joint's, so the error never grows past ERROR_MM */
function metresPerUnit(node) {
  const skin = node.getSkin();
  if (skin === null) return scaleOf(node.getWorldMatrix());
  const ibm = skin.getInverseBindMatrices();
  return Math.min(...skin.listJoints().map((joint, i) => scaleOf(mul(joint.getWorldMatrix(), ibm.getElement(i, [])))));
}

/** simplify one primitive in place: a new index, its unused vertices dropped from every attribute; [before, after] */
function simplify(primitive, metres) {
  const position = primitive.getAttribute('POSITION'), index = primitive.getIndices();
  if (position === null || index === null || primitive.listTargets().length > 0) return [0, 0];
  const count = position.getCount(), points = new Float32Array(count * 3), el = [];
  for (let i = 0; i < count; i++) points.set(position.getElement(i, el), i * 3);
  const before = Uint32Array.from(index.getArray());
  const [after] = MeshoptSimplifier.simplify(before, points, 3, 0, ERROR_MM / 1000 / metres, ['ErrorAbsolute']);
  // compact: the kept vertices in first-use order
  const remap = new Int32Array(count).fill(-1), order = [];
  const indices = Uint32Array.from(after, (v) => { if (remap[v] === -1) { remap[v] = order.length; order.push(v); } return remap[v]; });
  for (const semantic of primitive.listSemantics()) {
    const attribute = primitive.getAttribute(semantic), size = attribute.getElementSize(), source = attribute.getArray();
    const out = new source.constructor(order.length * size);
    order.forEach((v, i) => { for (let c = 0; c < size; c++) out[i * size + c] = source[v * size + c]; });
    attribute.setArray(out);
  }
  index.setArray((order.length <= 65535 ? Uint16Array : Uint32Array).from(indices));
  return [before.length / 3, indices.length / 3];
}

/** The phone copy of a rig's bytes: every mesh simplified and compacted, everything else as it was. */
export async function phoneRig(source) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const doc = await io.readBinary(source);
  let before = 0, after = 0;
  const done = new Set();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh === null || done.has(mesh)) continue;
    done.add(mesh);
    const metres = metresPerUnit(node);
    for (const primitive of mesh.listPrimitives()) { const [b, a] = simplify(primitive, metres); before += b; after += a; }
  }
  return { bytes: await io.writeBinary(doc), before, after };
}

if (import.meta.main) {
  const { bytes, before, after } = await phoneRig(readFileSync(SOURCE));
  const summary = `fp-rig.phone.glb: ${before} -> ${after} triangles (${(100 * after / before).toFixed(0)} %), ${bytes.length} bytes, error ${ERROR_MM} mm`;
  if (process.argv.includes('--check')) {
    if (!existsSync(TARGET) || Buffer.compare(readFileSync(TARGET), Buffer.from(bytes)) !== 0) { console.error(`stale: ${TARGET} (run node scripts/nine-phone-rig.mjs)`); process.exit(1); }
    console.info(`fresh: ${summary}`);
  } else {
    writeFileSync(TARGET, bytes);
    console.info(summary);
  }
}
