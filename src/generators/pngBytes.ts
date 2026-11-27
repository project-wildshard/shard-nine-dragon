import { encodeBuildBytes } from '@wildshard/sdk/bake/byteCodec';

// SF7 (J525): a shardfile carries images only and the cook makes every KTX2. Nine's generated textures (the sign atlas,
// the sign glyph field, the held stand-in) were raw KTX2 baked here; they leave as 8-bit PNGs instead: grey for one
// channel, RGBA for colour or packed data. `srgb` writes PNG's sRGB chunk for a colour texture; a data map has none.

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) === 1 ? 0xedb8_8320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffff_ffff;
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffff_ffff) >>> 0;
}

function chunk(name: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length), view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = name.charCodeAt(i);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

/** An 8-bit PNG of `texels` (row-major, top row first): `channels` 1 (grey) or 4 (RGBA). */
export function encodePng(width: number, height: number, channels: 1 | 4, texels: Uint8Array, options: { readonly srgb?: boolean } = {}): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('PNG size must be whole and positive');
  const row = width * channels;
  if (texels.length !== row * height) throw new Error(`PNG texels are ${String(texels.length)} bytes, not ${String(row * height)}`);
  const header = new Uint8Array(13), view = new DataView(header.buffer);
  view.setUint32(0, width); view.setUint32(4, height);
  header[8] = 8; header[9] = channels === 1 ? 0 : 6;
  // Filter 0 on every scanline: the cook's reader (and any PNG decoder) takes it, and deflate still finds the runs.
  const raw = new Uint8Array((row + 1) * height);
  for (let y = 0; y < height; y++) raw.set(texels.subarray(y * row, (y + 1) * row), y * (row + 1) + 1);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...(options.srgb === true ? [chunk('sRGB', new Uint8Array([0]))] : []),
    chunk('IDAT', encodeBuildBytes(raw, 'deflate', 9)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}
