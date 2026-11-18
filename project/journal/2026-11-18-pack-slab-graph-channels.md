# Pack Nine's slab graph channels

> Written by: Codex
>
> **State:** locally qualified, 2026-11-18. ENGINE-MEMORY EM28 and ONE-FORMAT OF-EM28c.

Nine's ruled slabs store exact 15-bit flag words in Uint16 alongside finer
fixed-point light, width and wetness. Signed grid offsets round by at most
3.91 mm per axis. Slabs keep the same four-byte alignment for RGB spill,
packed into two Uint16 words and decoded at the vertex before interpolation.
A plain wall can omit its pattern channel when its seed is zero. The other
walls, coarse draws and facade retain their existing representation.

The compact SDK cook folds byte-identical vertices within each gridded chunk.
On exact Nine `9b0731d` with engine `28f7e96c`, test builds from the same
author content kept 704,230 triangles. Slab transport fell from 25.62 to
16.74 MB. Live WebGL buffers fell from 110.67 to 84.83 MB at control [L] in
all six alternating shared-lock native minimal WebKit Phone Low pairs.
Settled GPU footprint [K] fell at the median from 430.67 to 403.93 MB.
EM11 upper playing and loading fell from 1,047.84 to 1,015.22 MB and from
1,572.01 to 1,514.00 MB. The candidate passed all six native ledger readings.
The nine camera views preserve the buildings and lighting.

The combined result uses the next sharddev slab writer. A local SDK 0.4.8
migration with the writer overlaid reproduced all five compact slab hashes.
The next publish needs the released writer and engine v0.1.42 or newer.
