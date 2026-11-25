# The banyan leaf cards come back

QA 11-25 row 46, J519 (Jake, 11-25: J510 covers held items, props and creatures only; foliage cards come back), opus-fr13.

- The banyan's painted leaf-cluster cards are back in `canopyGeometry.ts` (row 52's 12 folded leaves per card are gone,
  with `leafTexels.ts`, its table and its test). The real-wire bars, railings and nets from row 52 stay.
- Phone frame, same cameras, local dev builds: spawn 0.99 M to 0.55 M triangles, under the banyan 0.91 M to 0.48 M,
  looking up at the crown 0.97 M to 0.50 M (row 52 had spawn 0.69 M before it; Low was 548k before, 980k after).
- Library 88.2 MB to 70.8 MB. Nine's library line moves back with the content (J439): 12,106,054, the pre-row-52 line
  plus the bars' 2,520 bytes. The tile exceptions did not move: the leaves never sat in the props tiles.
