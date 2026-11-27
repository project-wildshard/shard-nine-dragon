# Nine Dragon ships images only (SF7a, SF7b)

opus-pvpage, J525 and J527. The generators write PNG, not KTX2: the sign atlas (grey mono, sRGB RGBA colour, the four
hand-made single-level zstd KTX2 turned into PNGs of the same texels), the glyph field (RGBA, R and G its channels)
and the held stand-in (1x1). The 19 hand-made KTX2 in ktx2.generated.ts all had WebP originals, which the cook does
not encode, so each became a PNG of the same pixels and the table keeps only its GLB row. The KTX2 files leave the
mounts and stay on disk until Jake sees the look board (SF7g). On packed SDK and format main, wildshard check builds
80.46 MB and validates.
