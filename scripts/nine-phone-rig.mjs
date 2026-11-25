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
//   node scripts/nine-phone-rig.mjs [--check]     (after any change to fp-rig.glb, this script or meshoptimizer)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const ROOT = join(import.meta.dirname, '..');
/** the authored rig, and the phone copy checked in beside it */
export const SOURCE = join(ROOT, 'src/static/assets/nine-dragon/viewmodel/fp-rig.glb');
export const TARGET = join(ROOT, 'src/static/assets/nine-dragon/viewmodel/fp-rig.phone.glb');
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
/** a matrix's largest stretch (its longest basis column), so a non-uniform scale never lets an error grow past the bound */
function scaleOf(m) {
  return Math.max(Math.hypot(m[0], m[1], m[2]), Math.hypot(m[4], m[5], m[6]), Math.hypot(m[8], m[9], m[10]));
}
/** metres per unit of the mesh's own positions: a skinned mesh through its joints' bind pose (glTF skinning ignores its
 *  node matrix), a rigid one through its world matrix; the largest, so the error never grows past ERROR_MM */
function metresPerUnit(node) {
  const skin = node.getSkin();
  if (skin === null) return scaleOf(node.getWorldMatrix());
  const ibm = skin.getInverseBindMatrices();
  return Math.max(...skin.listJoints().map((joint, i) => scaleOf(mul(joint.getWorldMatrix(), ibm.getElement(i, [])))));
}
/** give a primitive its own copy of every accessor another primitive also reads, so compacting it leaves the other intact
 *  (R_upper and R_upper_hull share positions, skin and index; the hull's own _AHULLN must stay in step with them) */
function ownAccessors(primitive, users) {
  const rows = primitive.listSemantics().map(semantic => [semantic, primitive.getAttribute(semantic)]);
  if (rows.some(([, accessor]) => (users.get(accessor) ?? 0) > 1)) {
    // re-set every attribute in its original order (a replaced one would otherwise move to the end)
    for (const [semantic] of rows) primitive.setAttribute(semantic, null);
    for (const [semantic, accessor] of rows) primitive.setAttribute(semantic, (users.get(accessor) ?? 0) > 1 ? accessor.clone() : accessor);
  }
  const index = primitive.getIndices();
  if (index !== null && (users.get(index) ?? 0) > 1) primitive.setIndices(index.clone());
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

/** NB8's draw merge: the phone draws each group as one skinned mesh on its side's own joints (the engine's bindRig wants
 *  every skin to be one of the GraphArms row's joint sets, in order). A group's meshes share one look: the same base graph
 *  and the same parameters (no maps, the same hull width), so the merged mesh is dressed in its first member's look, which
 *  its node's `lookOf` extra names. A rigid member (the jian on R_weapon, a fixed child of R_hand that no clip moves) is
 *  skinned to its side's hand. The textured meshes keep their own maps and draws, and the claw's two keep their names,
 *  because the held view hides every mesh named `L_claw*` with the claw. */
export const MERGES = [
  { name: 'vm_phone_r_plain', from: ['R_jian', 'R_upper'], extras: {} },
  { name: 'vm_phone_r_hull', from: ['R_jian_hull', 'R_glove_hull', 'R_sleeve_hull', 'R_upper_hull'], extras: { hull: true, hullK: 1 } },
];
/** directions that move with their positions (normal-like channels; every shader that reads one normalizes it) */
const DIRECTIONS = new Set(['NORMAL', '_ANS', '_AHULLN']);

/** a column-major 4×4 inverse */
function invert(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-12) throw new Error('Singular rig matrix');
  const d = 1 / det;
  return [(a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d];
}
const point = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
/** a matrix's uniform scale: the cube root of its 3×3 determinant */
const scale3 = m => Math.cbrt(Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5])));
/** a direction through a rotation-and-uniform-scale matrix, its length kept */
function direction(m, [x, y, z]) {
  const s = scale3(m);
  return [(m[0] * x + m[4] * y + m[8] * z) / s, (m[1] * x + m[5] * y + m[9] * z) / s, (m[2] * x + m[6] * y + m[10] * z) / s];
}
/** a matrix's largest departure from rotation-and-uniform-scale (its columns' lengths and angles) */
function shear(m) {
  const c = [0, 4, 8].map(k => [m[k], m[k + 1], m[k + 2]]), len = c.map(v => Math.hypot(...v)), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.max(Math.abs(len[0] - len[1]) / len[0], Math.abs(len[0] - len[2]) / len[0], ...[[0, 1], [0, 2], [1, 2]].map(([i, j]) => Math.abs(dot(c[i], c[j])) / (len[i] * len[j])));
}

/** A member's matrix to the rig's rest (= bind) world space. A skinned member's joint × inverse-bind products must all be one
 *  matrix (its rest pose is its bind pose), else moving its vertices to rest space would change how the clips bend it. */
function placement(node, joints) {
  const skin = node.getSkin();
  if (skin === null) {
    const hand = joints.at(-1);
    if (hand === undefined || !/_hand$/u.test(hand.getName())) throw new Error("A rigid member needs its side's hand last");
    for (let up = node.getParentNode(); up !== hand; up = up.getParentNode()) if (up === null) throw new Error(`${node.getName()} is not under ${hand.getName()}`);
    return node.getWorldMatrix();
  }
  const own = skin.listJoints(), ibm = skin.getInverseBindMatrices();
  if (own.length !== joints.length || own.some((joint, i) => joint !== joints[i])) throw new Error(`${node.getName()}: its skin's joints differ from its side's`);
  const products = own.map((joint, i) => mul(joint.getWorldMatrix(), ibm.getElement(i, [])));
  const drift = Math.max(...products.map(m => Math.max(...m.map((x, k) => Math.abs(x - products[0][k])))));
  if (drift > 1e-5) throw new Error(`${node.getName()}: rest pose is not its bind pose (${drift})`);
  return products[0];
}

/** One primitive's attribute as one typed array over every member: positions and directions in rest world space (float),
 *  every other channel copied as stored, which must be stored alike in every member. */
function joined(group, semantic, primitives, matrices) {
  const transform = semantic === 'POSITION' || DIRECTIONS.has(semantic);
  // a member with no _ANS reads its NORMAL there (the held profile's `aNs: 'normal'` channel)
  const sources = primitives.map(p => p.getAttribute(semantic) ?? (semantic === '_ANS' ? p.getAttribute('NORMAL') : null));
  const sample = sources[0];
  if (sources.some(a => a === null)) throw new Error(`${group}: a member lacks ${semantic}`);
  if (!transform && sources.some(a => a.getComponentType() !== sample.getComponentType() || a.getNormalized() !== sample.getNormalized() || a.getType() !== sample.getType())) throw new Error(`${group}: ${semantic} is stored differently by its members`);
  const size = sample.getElementSize(), total = sources.reduce((sum, a) => sum + a.getCount(), 0);
  const out = transform ? new Float32Array(total * size) : new (sample.getArray().constructor)(total * size), el = [];
  let at = 0;
  sources.forEach((a, k) => {
    const m = matrices[k];
    if (!transform) out.set(a.getArray(), at * size);
    else for (let i = 0; i < a.getCount(); i++) { const v = a.getElement(i, el); out.set(semantic === 'POSITION' ? point(m, v) : direction(m, v), (at + i) * size); }
    at += a.getCount();
  });
  return { array: out, type: sample.getType(), normalized: transform ? false : sample.getNormalized() };
}

/** Merge each MERGES group in place: a new node under vm_root with one primitive, its vertices in rest world space on a new
 *  skin over the side's joints (inverse binds from the rest pose); the members' meshes, emptied nodes, skins and accessors go.
 *  Returns each group's members and their vertex ranges, for the test that poses both rigs. */
export function mergeRig(doc) {
  const root = doc.getRoot(), byName = new Map(root.listNodes().map(node => [node.getName(), node])), buffer = root.listBuffers()[0], ranges = [];
  for (const group of MERGES) {
    const members = group.from.map(name => { const node = byName.get(name); if (node?.getMesh() == null) throw new Error(`Missing merge member ${name}`); return node; });
    const host = members.find(node => node.getSkin() !== null);
    if (host === undefined) throw new Error(`${group.name} needs a skinned member`);
    const joints = host.getSkin().listJoints();
    const primitives = members.map(node => {
      const list = node.getMesh().listPrimitives();
      if (list.length !== 1 || list[0].getMode() !== 4 || list[0].listTargets().length > 0) throw new Error(`${node.getName()}: one plain triangle primitive`);
      return list[0];
    });
    const matrices = members.map(node => placement(node, joints));
    if (matrices.some(m => shear(m) > 1e-4)) throw new Error(`${group.name}: a member's matrix is not rotation and uniform scale`);
    const counts = primitives.map(p => p.getAttribute('POSITION').getCount()), total = counts.reduce((a, b) => a + b, 0);
    const primitive = doc.createPrimitive().setMode(4).setMaterial(primitives[0].getMaterial());
    // the host's channels in its order, then any other member's
    for (const semantic of new Set([host, ...members].flatMap(node => node.getMesh().listPrimitives()[0].listSemantics()))) {
      if (semantic === 'JOINTS_0' || semantic === 'WEIGHTS_0') continue;
      const { array, type, normalized } = joined(group.name, semantic, primitives, matrices);
      primitive.setAttribute(semantic, doc.createAccessor(`${group.name}_${semantic}`, buffer).setType(type).setArray(array).setNormalized(normalized));
    }
    // joints and weights: a skinned member's as stored (its skin's joints are the side's, in order), a rigid one's all on the hand
    const jointsOut = new Uint8Array(total * 4), weightsOut = new Uint8Array(total * 4), hand = joints.length - 1;
    let at = 0;
    primitives.forEach((p, k) => {
      const j = p.getAttribute('JOINTS_0'), w = p.getAttribute('WEIGHTS_0');
      if (w === null) for (let i = 0; i < counts[k]; i++) { jointsOut[(at + i) * 4] = hand; weightsOut[(at + i) * 4] = 255; }
      else {
        if (j.getComponentType() !== 5121 || w.getComponentType() !== 5121 || !w.getNormalized()) throw new Error(`${members[k].getName()}: expected byte joints and normalized byte weights`);
        jointsOut.set(j.getArray(), at * 4); weightsOut.set(w.getArray(), at * 4);
      }
      at += counts[k];
    });
    primitive.setAttribute('JOINTS_0', doc.createAccessor(`${group.name}_JOINTS_0`, buffer).setType('VEC4').setArray(jointsOut));
    primitive.setAttribute('WEIGHTS_0', doc.createAccessor(`${group.name}_WEIGHTS_0`, buffer).setType('VEC4').setArray(weightsOut).setNormalized(true));
    const index = [], spans = [];
    let base = 0;
    primitives.forEach((p, k) => {
      for (const i of p.getIndices().getArray()) index.push(i + base);
      spans.push({ name: members[k].getName(), vertices: [base, base + counts[k]] });
      base += counts[k];
    });
    primitive.setIndices(doc.createAccessor(`${group.name}_indices`, buffer).setType('SCALAR').setArray((total <= 65535 ? Uint16Array : Uint32Array).from(index)));
    const inverse = new Float32Array(joints.length * 16);
    joints.forEach((joint, i) => { inverse.set(invert(joint.getWorldMatrix()), i * 16); });
    const skin = doc.createSkin(group.name).setInverseBindMatrices(doc.createAccessor(`${group.name}_ibm`, buffer).setType('MAT4').setArray(inverse)).setSkeleton(host.getSkin().getSkeleton());
    for (const joint of joints) skin.addJoint(joint);
    host.getParentNode().addChild(doc.createNode(group.name).setMesh(doc.createMesh(group.name).addPrimitive(primitive)).setSkin(skin).setExtras({ ...group.extras, lookOf: members[0].getName() }));
    ranges.push({ name: group.name, members: spans });
    for (const member of members) {
      const mesh = member.getMesh(), old = member.getSkin();
      member.setMesh(null).setSkin(null);
      if (mesh.listParents().every(parent => parent === root)) { for (const p of mesh.listPrimitives()) p.dispose(); mesh.dispose(); }
      if (old !== null && old.listParents().every(parent => parent === root)) old.dispose();
      if (member.listChildren().length === 0) member.dispose();
    }
  }
  for (const accessor of root.listAccessors()) if (accessor.listParents().every(parent => parent === root)) accessor.dispose();
  return ranges;
}

/** The phone copy of a rig's bytes: every mesh simplified and compacted, then NB8's groups merged; everything else as it was. */
export async function phoneRig(source) {
  const { doc, before, after } = await simplifiedRig(source);
  const merged = mergeRig(doc);
  return { bytes: await io.writeBinary(doc), before, after, merged, meshes: doc.getRoot().listMeshes().length };
}

/** The rig's document with every mesh simplified and compacted (the bake before NB8's merge); [before, after] triangles. */
export async function simplifiedRig(source) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const doc = await io.readBinary(source);
  const primitives = doc.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives()), users = new Map();
  for (const p of primitives) for (const accessor of new Set([...p.listAttributes(), p.getIndices()])) if (accessor !== null) users.set(accessor, (users.get(accessor) ?? 0) + 1);
  for (const p of primitives) ownAccessors(p, users);
  let before = 0, after = 0;
  const done = new Set();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh === null || done.has(mesh)) continue;
    done.add(mesh);
    const metres = metresPerUnit(node);
    for (const primitive of mesh.listPrimitives()) { const [b, a] = simplify(primitive, metres); before += b; after += a; }
  }
  return { doc, before, after };
}

// Checked in beside the rig, so every product build (`pnpm build:shards`, a direct `wildshard build`) mounts it;
// test/nine-phone-rig.test.ts refuses a copy that differs from a fresh bake.
if (import.meta.main) {
  const { bytes, before, after, meshes } = await phoneRig(readFileSync(SOURCE));
  const summary = `fp-rig.phone.glb: ${before} -> ${after} triangles (${(100 * after / before).toFixed(0)} %), ${meshes} meshes, ${bytes.length} bytes, error ${ERROR_MM} mm`;
  if (process.argv.includes('--check')) {
    if (!existsSync(TARGET) || Buffer.compare(readFileSync(TARGET), Buffer.from(bytes)) !== 0) { console.error(`stale: ${TARGET} (run node scripts/nine-phone-rig.mjs)`); process.exit(1); }
    console.info(`fresh: ${summary}`);
  } else {
    writeFileSync(TARGET, bytes);
    console.info(summary);
  }
}
