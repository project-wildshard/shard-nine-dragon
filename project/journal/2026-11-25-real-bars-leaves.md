# Real bars and banyan leaves

QA 11-24 row 52 (J510, and the shard's rule "real bars, never cut-out cards"), opus-looks.

- Every alpha-cut bars or net quad (skybridge glazing, deck and outrigger railings, catwalks, bridge nets, gallery railings
  and the catch net) is real wire geometry from `realBars.ts` (`Kit.wire` prisms in the opaque kit); the alpha kit is gone.
- Each banyan leaf card becomes 12 folded leaves sampling solid texels of the canopy painting (`leafTexels.ts`,
  `src/data/leafTexels.json`), so nothing is alpha cut. The unused bars in `dressing.ts` (balcony, cage) are deleted.
- Cost, phone frame from the same cameras on local product builds: spawn 95 calls 694,419 to 1,155,823 triangles; banyan
  70 to 67 calls 372,179 to 803,698; well 57 to 60 calls 492,928 to 599,996. Library 66.5 to 88.2 MB; tile debt rows
  1/1/0, 1/1/1 and 1/1/2 re-recorded with the content (J439/J444). LEAF_COUNT in `canopyGeometry.ts` is the dial.
