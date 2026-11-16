import { bakeRawColourPixels } from '@wildshard/sharddev/bake/rawTexture';
import type { ProjectGenerationContext } from '@wildshard/sharddev/projectGeneration';
import { parseHeldMeshes, parseHeldRigSource, type NineHeldMesh } from './sections';

/** Existing authored rig, read only through the build's declared public asset root. */
export const NINE_HELD_RIG = '/assets/nine-dragon/viewmodel/fp-rig.glb';
/** NB8: the phone tier's rig (engine `phoneUrl` serves it there), baked by scripts/nine-phone-rig.mjs with merged meshes. */
export const NINE_HELD_PHONE_RIG = '/assets/nine-dragon/viewmodel/fp-rig.phone.glb';
/** `phoneMeshes`: the phone rig's merged meshes, each dressed in the look of the authored mesh its `lookOf` extra names */
export interface NineHeldProfile { readonly meshes: readonly NineHeldMesh[]; readonly phoneMeshes: readonly NineHeldMesh[]; readonly standIn: Uint8Array }

/** The ordered mesh, channel and transform rows directly from a rig GLB's JSON chunk, each in `look(index, lookOf)`. */
function rigRows(bytes: Uint8Array, look: (index: number, lookOf: string | undefined) => string): readonly NineHeldMesh[] {
  if (bytes.byteLength < 20 || bytes.byteLength > 25_000_000) throw new Error('Invalid held rig GLB bounds');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), size = view.getUint32(12, true);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength
    || view.getUint32(16, true) !== 0x4e4f534a || size < 2 || size > bytes.byteLength - 20) throw new Error('Invalid held rig GLB header');
  const source = parseHeldRigSource(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + size))));
  return parseHeldMeshes(source.nodes.filter(node => node.mesh !== undefined).map((node, index) => {
    const mesh = node.mesh === undefined ? undefined : source.meshes[node.mesh];
    if (mesh === undefined || mesh.primitives.length !== 1 || node.name === undefined) throw new Error('Held rig requires named single-primitive meshes');
    const primitive = mesh.primitives[0]; if (primitive === undefined) throw new Error('Missing held rig primitive');
    const extras = node.extras ?? {}, attributes = Object.keys(primitive.attributes);
    const channels = { aMat: '_amat', ...(attributes.includes('_AFACE') ? { aFace: '_aface' } : {}),
      ...(attributes.includes('_AHULLN') ? { aHullN: '_ahulln' } : {}), ...(attributes.includes('NORMAL') ? { aNs: attributes.includes('_ANS') ? '_ans' : 'normal' } : { normal: 'aHullN' }) };
    return { name: node.name, look: look(index, extras.lookOf), attributes, channels,
      hull: extras.hull === true, width: extras.hullK ?? 1, maps: extras.maps ?? '',
      rotation: extras.assetRot ?? [1, 0, 0, 0, 1, 0, 0, 0, 1], doubleSide: node.skin !== undefined && extras.hull !== true };
  }));
}

/** Derive the same ordered mesh, channel and transform rows directly from the original GLB JSON chunk, one look per mesh. */
export function nineHeldMeshes(bytes: Uint8Array): readonly NineHeldMesh[] { return rigRows(bytes, index => `nine-vm-rig-${index}`); }

/** The phone rig's rows the authored rig lacks (its merged meshes), each in the look of the authored mesh its `lookOf`
 *  names. A mesh both rigs name must read the same channels: the held view dresses it from the one row. */
export function ninePhoneHeldMeshes(bytes: Uint8Array, authored: readonly NineHeldMesh[]): readonly NineHeldMesh[] {
  const byName = new Map(authored.map(row => [row.name, row]));
  const rows = rigRows(bytes, (_index, lookOf) => (lookOf === undefined ? undefined : byName.get(lookOf)?.look) ?? '');
  for (const row of rows) {
    const shared = byName.get(row.name);
    if (shared !== undefined && JSON.stringify(shared.channels) !== JSON.stringify(row.channels)) throw new Error(`Phone rig mesh ${row.name} reads other channels`);
    if (shared === undefined && row.look === '') throw new Error(`Phone rig mesh ${row.name} names no authored lookOf`);
  }
  return rows.filter(row => !byName.has(row.name));
}

/** Cache only the rigs' mesh declarations; the tiny exact black texel remains an owned binary. */
export async function nineHeldProfile(ctx: Pick<ProjectGenerationContext, 'cached'>): Promise<NineHeldProfile> {
  const files = await ctx.cached({ id: 'held-profile', inputs: [NINE_HELD_RIG, NINE_HELD_PHONE_RIG] }, inputs => {
    const bytes = inputs.get(NINE_HELD_RIG), phone = inputs.get(NINE_HELD_PHONE_RIG);
    if (bytes === undefined || phone === undefined) throw new Error('Missing Nine held rig source');
    const meshes = nineHeldMeshes(bytes), encode = (rows: readonly NineHeldMesh[]): Uint8Array => new TextEncoder().encode(JSON.stringify(rows));
    return new Map([['meshes.json', encode(meshes)], ['phone.json', encode(ninePhoneHeldMeshes(phone, meshes))]]);
  });
  const read = (name: string): readonly NineHeldMesh[] => {
    const rows = files.get(name); if (rows === undefined) throw new Error('Missing Nine held profile metadata');
    return parseHeldMeshes(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rows)));
  };
  return { meshes: read('meshes.json'), phoneMeshes: read('phone.json'),
    standIn: bakeRawColourPixels({ width: 1, height: 1, pixels: new Uint8ClampedArray([0, 0, 0, 255]) }, { colourSpace: 'linear' }) };
}
