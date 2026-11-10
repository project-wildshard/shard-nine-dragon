import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { NodeIO, type Document, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
// @ts-expect-error -- plain JS build script (scripts/ is outside the typed tree)
import { phoneRig, SOURCE, TARGET } from '../scripts/nine-phone-rig.mjs';

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

/** NINE-DRAGON-BENCHMAX NB8: the phone's rig is the authored rig with fewer triangles and nothing else changed. */
test('the phone rig keeps every node, skin, clip and vertex, with under a third of the triangles, and is fresh', async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const source = new Uint8Array(readFileSync(SOURCE));
  const baked = await phoneRig(source), again = await phoneRig(source);
  expect(Buffer.compare(Buffer.from(baked.bytes), Buffer.from(again.bytes))).toBe(0);
  // the checked-in copy is the bake (else: node scripts/nine-phone-rig.mjs)
  expect(Buffer.compare(readFileSync(TARGET), Buffer.from(baked.bytes))).toBe(0);
  const [desktop, phone] = await Promise.all([io.readBinary(source), io.readBinary(baked.bytes)]);
  const shape = (doc: Document): unknown => ({
    nodes: doc.getRoot().listNodes().map(node => [node.getName(), node.getMatrix(), node.getMesh()?.getName() ?? null, node.getSkin() !== null]),
    clips: doc.getRoot().listAnimations().map(clip => [clip.getName(), clip.listChannels().map(channel => [channel.getTargetNode()?.getName(), channel.getTargetPath(),
      Array.from(channel.getSampler()?.getInput()?.getArray() ?? []), Array.from(channel.getSampler()?.getOutput()?.getArray() ?? [])])]),
    skins: doc.getRoot().listSkins().map(skin => [skin.listJoints().map(joint => joint.getName()), Array.from(skin.getInverseBindMatrices()?.getArray() ?? [])]),
    primitives: primitives(doc).map(p => [vertices(p).storage, p.getMaterial()?.getName(), p.getMode()]),
  });
  expect(shape(phone)).toEqual(shape(desktop));
  expect(triangles(desktop)).toBe(baked.before);
  expect(triangles(phone)).toBe(baked.after);
  expect(baked.after).toBeLessThan(baked.before / 3);
  // every phone vertex is one of its source primitive's vertices, all attributes together (a shared accessor compacted for
  // one primitive would scramble the other's), and every kept index points at a kept vertex
  const sources = primitives(desktop);
  primitives(phone).forEach((p, k) => {
    const from = sources[k];
    if (from === undefined) throw new Error('primitive count differs');
    const known = new Set(vertices(from).tuples), kept = vertices(p).tuples;
    expect(kept.filter(tuple => !known.has(tuple))).toEqual([]);
    const index = p.getIndices()?.getArray() ?? [];
    expect(Array.from(index).every(i => i < kept.length)).toBe(true);
  });
}, 120_000);
