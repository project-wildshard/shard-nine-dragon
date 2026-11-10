import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
// @ts-expect-error -- plain JS build script (scripts/ is outside the typed tree)
import { phoneRig, SOURCE } from '../scripts/nine-phone-rig.mjs';

/** NINE-DRAGON-BENCHMAX NB8: the phone's rig is the authored rig with fewer triangles and nothing else changed. */
test('the phone rig keeps every node, skin, clip and attribute, with at most a third of the triangles', async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const source = new Uint8Array(readFileSync(SOURCE));
  const first = await phoneRig(source), again = await phoneRig(source);
  expect(Buffer.compare(Buffer.from(first.bytes), Buffer.from(again.bytes))).toBe(0);
  const [desktop, phone] = await Promise.all([io.readBinary(source), io.readBinary(first.bytes)]);
  const shape = (doc: typeof desktop): unknown => ({
    nodes: doc.getRoot().listNodes().map(node => [node.getName(), node.getMesh() !== null, node.getSkin() !== null]),
    clips: doc.getRoot().listAnimations().map(clip => [clip.getName(), clip.listChannels().length]),
    skins: doc.getRoot().listSkins().map(skin => skin.listJoints().length),
    primitives: doc.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives().map(p => [p.listSemantics().join(','), p.getMaterial()?.getName()])),
  });
  expect(shape(phone)).toEqual(shape(desktop));
  const triangles = (doc: typeof desktop): number => doc.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives())
    .reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  expect(triangles(desktop)).toBeGreaterThan(200_000);
  expect(triangles(phone)).toBe(first.after);
  expect(triangles(phone)).toBeLessThan(triangles(desktop) / 3);
  // every kept index points at a kept vertex
  for (const p of phone.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives())) {
    const count = p.getAttribute('POSITION')?.getCount() ?? 0, index = p.getIndices()?.getArray() ?? [];
    expect(Math.max(...index)).toBeLessThan(count);
  }
}, 60_000);
