// QA 2026-11-24 row 52 (J510): the banyan's leaves are geometry, not cut-out cards, but each leaf keeps the leaf
// atlas's own painted colour by sampling one solid texel of it (a texel whose whole 9×9 block is opaque, so its mips
// stay opaque). ../data/leafTexels.json holds the picks per atlas tile; test/nine-leaf-geometry.test.ts recomputes them
// from public/assets/nine-dragon/lab/organic/leaf-atlas.webp and fails when the file is stale. v = 1 is the image's top.

/** Decoded RGBA, rows top to bottom (as the image file stores them). */
export interface Raster { readonly width: number; readonly height: number; readonly pixels: Uint8ClampedArray }

/** picks per tile */
const PICKS = 48, RADIUS = 4;

/** For each of the atlas's tiles × tiles cells (row-major from the image top, as cardGeometry's `tile`), solid uv picks. */
export function leafTexels(r: Raster, tiles = 2): [number, number][][] {
  const { width: w, height: h, pixels } = r, solid = new Uint8Array(w * h), rows = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = (pixels[i * 4 + 3] ?? 0) >= 250 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ok = 1; for (let d = -RADIUS; d <= RADIUS && ok; d++) { const xx = x + d; ok = xx >= 0 && xx < w ? (solid[y * w + xx] ?? 0) : 0; }
    rows[y * w + x] = ok;
  }
  const out: [number, number][][] = [];
  for (let ty = 0; ty < tiles; ty++) for (let tx = 0; tx < tiles; tx++) {
    const found: [number, number][] = [];
    const x0 = Math.floor((tx / tiles) * w), x1 = Math.floor(((tx + 1) / tiles) * w), y0 = Math.floor((ty / tiles) * h), y1 = Math.floor(((ty + 1) / tiles) * h);
    for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) {
      let ok = 1; for (let d = -RADIUS; d <= RADIUS && ok; d++) { const yy = y + d; ok = yy >= 0 && yy < h ? (rows[yy * w + x] ?? 0) : 0; }
      const red = pixels[(y * w + x) * 4] ?? 0, green = pixels[(y * w + x) * 4 + 1] ?? 0;
      if (ok === 1 && green > red) found.push([Math.round(((x + 0.5) / w) * 1e5) / 1e5, Math.round((1 - (y + 0.5) / h) * 1e5) / 1e5]);
    }
    const step = Math.max(1, found.length / PICKS);
    out.push(Array.from({ length: Math.min(PICKS, found.length) }, (_, k) => found[Math.floor(k * step)] ?? [0.25, 0.25]));
  }
  return out;
}
