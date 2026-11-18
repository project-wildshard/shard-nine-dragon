import { BufferAttribute, type BufferGeometry } from 'three';

// Ruled kits use 12 flag bits plus a 3-bit surface. The top storage bit marks the packed vertex.
export const SLAB_FLAG_MARKER = 32768;
export const SLAB_MISC_SCALE = 8192;
export const SLAB_OFFSET_SCALE = 128;
// Ten bits per light component. Two 16-bit words use the same four-byte Metal stride.
export const SLAB_SPILL_SCALE = 256;
export const SLAB_SPILL_WORD = 1024;

/** L0's ruled surface input. Linear light, width and wetness take a fine unsigned grid.
 * The whole flag word stays exact and signed UV offsets keep a 1/128-metre grid. */
export function packSlabGraphChannels(geometry: BufferGeometry, plain: boolean): void {
  const sourceMisc = geometry.getAttribute('aMisc'), sourceOff = geometry.getAttribute('aOff');
  const sourceSpill = geometry.getAttribute('aSpill'), pat = geometry.getAttribute('aPat');
  if (sourceMisc === undefined || sourceMisc.itemSize !== 4 || sourceOff === undefined || sourceSpill === undefined) return;
  if (sourceOff.itemSize !== 2 || sourceOff.count !== sourceMisc.count || sourceSpill.count !== sourceMisc.count || sourceSpill.itemSize < 3) throw new Error('Nine slab graph channels differ');
  const misc = new Uint16Array(sourceMisc.count * 4), off = new Int16Array(sourceOff.count * 2), spill = new Uint16Array(sourceSpill.count * 2);
  let omitPattern = plain && pat !== undefined && pat.itemSize === 4;
  // The red lane needs an extra unit of range; green and blue keep twice its precision.
  const redScale = SLAB_SPILL_SCALE / 2;
  for (let vertex = 0; vertex < sourceMisc.count; vertex++) {
    const flags = sourceMisc.getW(vertex), x = Math.round(sourceOff.getX(vertex) * SLAB_OFFSET_SCALE), y = Math.round(sourceOff.getY(vertex) * SLAB_OFFSET_SCALE);
    if (!Number.isInteger(flags) || flags < 0 || flags >= SLAB_FLAG_MARKER || !Number.isFinite(x) || !Number.isFinite(y)
      || x < -32768 || x > 32767 || y < -32768 || y > 32767) return;
    const r = Math.round(sourceSpill.getX(vertex) * redScale), g = Math.round(sourceSpill.getY(vertex) * SLAB_SPILL_SCALE);
    const b = Math.round(sourceSpill.getZ(vertex) * SLAB_SPILL_SCALE);
    if (![r, g, b].every(value => value >= 0 && value < SLAB_SPILL_WORD)) return;
    spill[vertex * 2] = r * 64 + Math.floor(g / 16);
    spill[vertex * 2 + 1] = (g % 16) * SLAB_SPILL_WORD + b;
    if (pat?.getW(vertex) !== 0) omitPattern = false;
    misc[vertex * 4 + 3] = flags + SLAB_FLAG_MARKER;
    off[vertex * 2] = x; off[vertex * 2 + 1] = y;
    for (let lane = 0; lane < 3; lane++) {
      const word = Math.round(sourceMisc.getComponent(vertex, lane) * SLAB_MISC_SCALE);
      if (!Number.isFinite(word) || word < 0 || word > 65535) return;
      misc[vertex * 4 + lane] = word;
    }
  }
  geometry.setAttribute('aMisc', new BufferAttribute(misc, 4));
  geometry.setAttribute('aOff', new BufferAttribute(off, 2));
  geometry.setAttribute('aSpill', new BufferAttribute(spill, 2));
  // On the plain graph the other pattern lanes are for inactive kinds. Its seed is a constant zero here.
  if (omitPattern) geometry.deleteAttribute('aPat');
}
