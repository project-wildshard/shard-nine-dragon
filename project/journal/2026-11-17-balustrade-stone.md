# 2026-11-17 — the balustrade's stone collides

- NET-LAG (meta docs/plans/NET-LAG-PLAN.md), opus-netlag3. Staging v0.1.37
  corrected a Chromium sprint along the square's balustrade 114 times a
  minute (worst 2.76 m): the room kept the feet at y 125 while the page
  bounced 1 to 40 cm and fell behind.
- The drawn balustrade (squareParts WELL_RUNS, x 0.2 by the square, 0.7 by
  the street) had no collider below the square's cap, which starts 1.12 m
  up. A walker slid its feet past the slab's edge under the cap and hung on
  that edge; that pose depends on the order the world met the edge and the
  cap, and the page and the room never build in the same order (a native
  probe parts the same walk by 1.4 cm to a metre). Along the street, with
  no cap, the walk went straight through the drawn stone into the Well.
- Two static boxes now stand under both runs, the plinth's 0.62 m wide and
  up to the caps' +1.12, like the south rim's `well.stone`. The four source
  rows and the oracle that pin these bytes move by 223 bytes each (446 for
  the world install's two variants).
