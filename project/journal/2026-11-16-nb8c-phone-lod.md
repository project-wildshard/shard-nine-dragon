# 2026-11-16: phone LOD bands and the plain slab (NB8)

> Written by: Claude (mini-nb8c, Mac mini)

- Meta NINE-DRAGON-BENCHMAX NB8, after mini-nb8b's slab-chunk join (`ca191b3`). Three phone-only cuts, desktop unchanged:
  the paper lantern's past-80 m level is a 12-triangle `lantern:pin` on the phone (the 24-triangle dot keeps a 1 cm band:
  the format wants every tier's LOD starts to rise); the crowd's 22 m copy starts at 12 m on the phone, so its 12 m level
  draws nothing; dressing copies under 0.007 rad (was 0.005) drop on the phone. NB1 phone spawn 118 to 116 draws, 1.094 to
  1.046 M; 60 s walk p95 124 to 121 draws, 1.20 to 1.08 M. Same-pose pairs differ only in the rain; the hero (desktop) too.
- The plain-architecture slab was the lever asked for. It has no phone-only path in the shard: a slab library has no
  tier (format `worldScenesForTier` filters owned models, pool files, batches and placements only), so a decimated bank
  would be a second download. Measured on the layout: the slab's 515 k plain triangles are 257 k inside the spawn frustum
  (the phone's leaf runs submit 350 k); 41 k of the element calls are thin rods, rolls and ornaments. Options and their
  sizes, for whoever picks it up:
  - a phone `until` knob on per-region "fine" nodes (rods under 8-12 cm): 27-34 k fewer at the spawn, +1-3 phone draws,
    +1 desktop draw per region (each banded node is its own slab key);
  - a phone world-scene batch (one multi-draw, per-piece LOD) in place of the slab: plain 12 draws to 1, but the phone
    would download the plain geometry twice (~26 MB compressed in slabs today);
  - hidden faces (opposite coplanar contact): 6.8 % of plain, lossless, both tiers, needs closed-box bookkeeping in the kit;
  - engine, phone only: drop slab triangles whose shortest edge is under 1 device px (0.001 rad) per k-d leaf: -81 k plain at
    the spawn (31 % of what is in view), -0.1 M at 0.002 rad; needs multi-draw or a second run per chunk.
