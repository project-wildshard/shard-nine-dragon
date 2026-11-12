# well-crossing

- Added `test/ci/well-crossing.test.mjs` (meta TEST-COVERAGE SH-nine-4, J186,
  CI only): the course's own crossing on the built product by real inputs.
  Hop the square's balustrade onto the Well's south rim (published
  `escape-rim-hop`), walk the rim, walk into the parapet and jump at the
  guard cap above it (both hold, nothing filed), then aim, named LOCK and
  fire at the ring over the humped timber bridge: the Fei Zhua lifts over
  the cap (peak 129.1 > top 128.2), lands on the hump (y 120.1, deck 119.1)
  under the locked ring and files Over the Well once, and the deck walks on.
  About 0.16 s locally. Mutants that drop the fact or hold the guard open
  fail it.
- Found on the way: a named LOCK on the ring at (-7.6, 122.5, -24) from the
  same rim spot drops the player down the shaft to y 32 with no fact, and a
  named LOCK on an out-of-reach ring falls back to the nearest ring (it
  lands on the square). Not asserted; the engine owns both.
