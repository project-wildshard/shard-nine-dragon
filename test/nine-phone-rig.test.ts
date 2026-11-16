import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { NodeIO, type Document, type Node, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
// @ts-expect-error -- plain JS build script (scripts/ is outside the typed tree)
import { MERGES, phoneRig, simplifiedRig, SOURCE, TARGET } from '../scripts/nine-phone-rig.mjs';

type Merge = { readonly name: string; readonly from: readonly string[] };
type Mat = number[];

/** every vertex of a primitive as one tuple of all its attributes' stored values, plus each accessor's storage shape */
function vertices(p: Primitive): { tuples: string[]; storage: string } {
  const semantics = p.listSemantics(), count = p.getAttribute('POSITION')?.getCount() ?? 0;
  const tuples = Array.from({ length: count }, (_, i) => semantics.map(semantic => {
    const accessor = p.getAttribute(semantic), size = accessor?.getElementSize() ?? 0, array = accessor?.getArray() ?? [];
    return Array.from({ length: size }, (_unused, c) => array[i * size + c]).join(',');
  }).join('|'));
  const storage = semantics.map(semantic => { const a = p.getAttribute(semantic); return `${semantic}:${a?.getType()}:${a?.getComponentType()}:${a?.getNormalized()}`; }).join(' ');
  return { tuples, storage };
}
const primitives = (doc: Document): Primitive[] => doc.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives());
const triangles = (doc: Document): number => primitives(doc).reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const clips = (doc: Document): unknown => doc.getRoot().listAnimations().map(clip => [clip.getName(), clip.listChannels().map(channel => [channel.getTargetNode()?.getName(), channel.getTargetPath(),
  Array.from(channel.getSampler()?.getInput()?.getArray() ?? []), Array.from(channel.getSampler()?.getOutput()?.getArray() ?? [])])]);

/** column-major 4×4 product */
function mul(a: Mat, b: Mat): Mat {
  const o = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] = (o[c * 4 + r] ?? 0) + (a[k * 4 + r] ?? 0) * (b[c * 4 + k] ?? 0);
  return o;
}
function compose(t: number[], q: number[], s: number[]): Mat {
  const [x = 0, y = 0, z = 0, w = 1] = q, [sx = 1, sy = 1, sz = 1] = s;
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, t[0] ?? 0, t[1] ?? 0, t[2] ?? 0, 1];
}
/** a LINEAR channel's value at `time` (quaternions by normalized lerp, close to slerp at the clips' frame spacing) */
function sample(input: ArrayLike<number>, output: ArrayLike<number>, size: number, time: number): number[] {
  let i = 0; while (i < input.length - 2 && (input[i + 1] ?? 0) <= time) i++;
  const t0 = input[i] ?? 0, t1 = input[i + 1] ?? t0, k = t1 > t0 ? Math.min(1, Math.max(0, (time - t0) / (t1 - t0))) : 0;
  const a = Array.from({ length: size }, (_, c) => output[i * size + c] ?? 0), b = Array.from({ length: size }, (_, c) => output[Math.min(i + 1, input.length - 1) * size + c] ?? 0);
  const sign = size === 4 && a.reduce((d, v, c) => d + v * (b[c] ?? 0), 0) < 0 ? -1 : 1, v = a.map((x, c) => x + ((b[c] ?? 0) * sign - x) * k);
  if (size !== 4) return v;
  const n = Math.hypot(...v); return v.map(x => x / n);
}
/** every node's world matrix with `clip` at `time` (its channels over the nodes' rest TRS) */
function posed(doc: Document, clip: string, time: number): Map<Node, Mat> {
  const trs = new Map(doc.getRoot().listNodes().map(node => [node, { translation: node.getTranslation() as number[], rotation: node.getRotation() as number[], scale: node.getScale() as number[] }]));
  const animation = doc.getRoot().listAnimations().find(a => a.getName() === clip);
  for (const channel of animation?.listChannels() ?? []) {
    const node = channel.getTargetNode(), path = channel.getTargetPath(), s = channel.getSampler(), row = node === null ? undefined : trs.get(node);
    if (row === undefined || s === null || (path !== 'translation' && path !== 'rotation' && path !== 'scale')) continue;
    row[path] = sample(s.getInput()?.getArray() ?? [], s.getOutput()?.getArray() ?? [], path === 'rotation' ? 4 : 3, time);
  }
  const world = new Map<Node, Mat>();
  const walk = (node: Node, parent: Mat): void => {
    const row = trs.get(node); if (row === undefined) return;
    const m = mul(parent, compose(row.translation, row.rotation, row.scale)); world.set(node, m);
    for (const child of node.listChildren()) walk(child, m);
  };
  for (const scene of doc.getRoot().listScenes()) for (const node of scene.listChildren()) walk(node, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return world;
}
/** a mesh node's vertices as drawn (glTF skinning: the joints' world × inverse bind, weighted; a rigid node by its world) */
function drawn(node: Node, world: Map<Node, Mat>): number[][] {
  const p = node.getMesh()?.listPrimitives()[0], position = p?.getAttribute('POSITION'), skin = node.getSkin();
  if (p === undefined || position == null) throw new Error(`${node.getName()} has no positions`);
  const at = (m: Mat, v: number[]): number[] => [0, 1, 2].map(r => (m[r] ?? 0) * (v[0] ?? 0) + (m[4 + r] ?? 0) * (v[1] ?? 0) + (m[8 + r] ?? 0) * (v[2] ?? 0) + (m[12 + r] ?? 0));
  const bones = skin === null ? [] : skin.listJoints().map((joint, i) => mul(world.get(joint) ?? [], skin.getInverseBindMatrices()?.getElement(i, []) ?? []));
  const joints = p.getAttribute('JOINTS_0'), weights = p.getAttribute('WEIGHTS_0'), v: number[] = [], j: number[] = [], w: number[] = [];
  return Array.from({ length: position.getCount() }, (_, i) => {
    position.getElement(i, v);
    if (skin === null) return at(world.get(node) ?? [], v);
    joints?.getElement(i, j); weights?.getElement(i, w);
    const total = w.reduce((a, b) => a + b, 0), out = [0, 0, 0];
    for (let k = 0; k < 4; k++) { const q = at(bones[j[k] ?? 0] ?? [], v); for (let c = 0; c < 3; c++) out[c] = (out[c] ?? 0) + (q[c] ?? 0) * (w[k] ?? 0) / total; }
    return out;
  });
}

/** NINE-DRAGON-BENCHMAX NB8: the phone's rig is the authored rig with fewer triangles and fewer draws, and nothing else changed. */
test('the phone rig simplifies every mesh, merges its plain and hull groups without moving a vertex in any clip, and is fresh', async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const source = new Uint8Array(readFileSync(SOURCE));
  const baked = await phoneRig(source), again = await phoneRig(source);
  expect(Buffer.compare(Buffer.from(baked.bytes), Buffer.from(again.bytes))).toBe(0);
  // the checked-in copy is the bake (else: node scripts/nine-phone-rig.mjs)
  expect(Buffer.compare(readFileSync(TARGET), Buffer.from(baked.bytes))).toBe(0);
  const [desktop, phone, { doc: simple }] = await Promise.all([io.readBinary(source), io.readBinary(baked.bytes), simplifiedRig(source)]);

  // the simplification: every node, skin, clip and vertex kept, under a third of the triangles
  const shape = (doc: Document): unknown => ({
    nodes: doc.getRoot().listNodes().map(node => [node.getName(), node.getMatrix(), node.getMesh()?.getName() ?? null, node.getSkin() !== null]), clips: clips(doc),
    skins: doc.getRoot().listSkins().map(skin => [skin.listJoints().map(joint => joint.getName()), Array.from(skin.getInverseBindMatrices()?.getArray() ?? [])]),
    primitives: primitives(doc).map(p => [vertices(p).storage, p.getMaterial()?.getName(), p.getMode()]),
  });
  expect(shape(simple)).toEqual(shape(desktop));
  expect(triangles(desktop)).toBe(baked.before);
  expect(triangles(simple)).toBe(baked.after);
  expect(baked.after).toBeLessThan(baked.before / 3);
  const sources = primitives(desktop);
  primitives(simple).forEach((p, k) => {
    const from = sources[k];
    if (from === undefined) throw new Error('primitive count differs');
    const known = new Set(vertices(from).tuples), kept = vertices(p).tuples;
    expect(kept.filter(tuple => !known.has(tuple))).toEqual([]);
    expect(Array.from(p.getIndices()?.getArray() ?? []).every(i => i < kept.length)).toBe(true);
  });

  // the merge: each group is one mesh, every other mesh as simplified, the same clips and triangles
  const merges = MERGES as readonly Merge[], members = new Set(merges.flatMap(group => group.from));
  const meshNodes = (doc: Document): string[] => doc.getRoot().listNodes().filter(node => node.getMesh() !== null).map(node => node.getName()).sort();
  expect(meshNodes(phone)).toEqual([...meshNodes(simple).filter(name => !members.has(name)), ...merges.map(group => group.name)].sort());
  expect(phone.getRoot().listMeshes().length).toBe(desktop.getRoot().listMeshes().length - members.size + merges.length);
  expect(clips(phone)).toEqual(clips(simple));
  expect(triangles(phone)).toBe(baked.after);
  const named = (doc: Document, name: string): Node => { const node = doc.getRoot().listNodes().find(n => n.getName() === name); if (node === undefined) throw new Error(`no ${name}`); return node; };
  for (const name of meshNodes(phone).filter(n => !merges.some(group => group.name === n))) {
    const a = named(phone, name).getMesh()?.listPrimitives()[0], b = named(simple, name).getMesh()?.listPrimitives()[0];
    if (a === undefined || b === undefined) throw new Error(name);
    expect(vertices(a).tuples).toEqual(vertices(b).tuples);
  }
  // every merged vertex lands where its member's did, at rest and through every clip (12 times each), within 0.01 mm
  let worst = 0, checked = 0;
  for (const clip of ['', ...phone.getRoot().listAnimations().map(a => a.getName())]) {
    const end = Math.max(0, ...phone.getRoot().listAnimations().filter(a => a.getName() === clip).flatMap(a => a.listSamplers().map(s => { const t = s.getInput()?.getArray(); return t === null || t === undefined ? 0 : (t[t.length - 1] ?? 0); })));
    for (let step = 0; step < (clip === '' ? 1 : 12); step++) {
      const time = end * step / 11, before = posed(simple, clip, time), after = posed(phone, clip, time);
      for (const [g, group] of merges.entries()) {
        const merged = drawn(named(phone, group.name), after);
        let offset = 0;
        for (const member of group.from) {
          const old = drawn(named(simple, member), before);
          old.forEach((v, i) => { const m = merged[offset + i] ?? []; worst = Math.max(worst, ...v.map((x, c) => Math.abs(x - (m[c] ?? Number.NaN)))); });
          offset += old.length; checked += old.length;
        }
        expect(offset, `group ${g}`).toBe(merged.length);
      }
    }
  }
  expect(checked).toBeGreaterThan(100_000);
  expect(worst).toBeLessThan(1e-5);
}, 240_000);
