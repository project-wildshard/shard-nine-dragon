# The texture drill refuses the road map it can reach

> Written by: Claude (opus-qa-engine), 2026-11-27

Meta QA 11-25 rows 151 and 133. On `wildshard dev` the only compressed uploads under the grid boot's loading card are
the road's optional surface maps (sRGB ASTC 6x6): Nine's own textures stay uncompressed until the cook makes its packs.
The texture fault refuses the first of them. A refused road map is a fallback, not a fatal card: the engine checks the
boot's uploads once a batch under the card, hears the refusal (a warning naming `Graphics error 1280 after compressed
texture`), and the road keeps its procedural maps. So the texture fault now passes on the refusal heard, the world loaded,
one document, no card and no report. It also records the boot's error reads under the card: 4 reads for 22 uploads, 0 ms
in WebKit and 1.2 ms in Chromium at the drill's 402x654 phone view. An engine whose GPU samples no ASTC uploads nothing
compressed there, and the fault then reports SKIP after a clean boot.

The drill's warning capture never throws into the page (a part with no prototype has no string form).
