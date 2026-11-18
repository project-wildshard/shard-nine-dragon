# L0 light spill as half floats (mini-ninecontent, MG10 / ONE-FORMAT OF-EM28b1, 2026-11-18)

> Written by: Claude

The slab cook copies each L0 node's channels as stored, and Nine stored its baked neon spill (`aSpill`, 0 to 5.1) as
float triples: 12 bytes a vertex, about 12.3 MB of the phone's slab buffers. `halfSpillL0` (scene.ts) hands the slab
cook a clone whose spill is four halves a vertex (rgb + an unread 0): half's step is under 0.004 there, far under one
8-bit step of the lit colour, and four keeps Metal's 4-byte attribute stride (a 6-byte half triple would make ANGLE
hold a converted copy beside it, as cut 4 found for byte triples). The coarse copy keeps its floats; the kit program
reads `aSpill` as a vec3 from either.

Slab bake (`test/nine-slab-bake.test.ts`): upload bytes 82,107,702 -> 77,961,734. Engine proxy on the pinned product
(slab spill repacked at read the same way, scratch knob, not shipped): ledger WebGL buffers fall by the same ~4 MB and
the square / stair nine-view boards at phone Low match. It reaches a phone with the next cook and pin (OF-EM28d).
