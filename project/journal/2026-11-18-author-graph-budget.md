# Author graphs keep their declared budget under format 0.34 (mini-ninecontent, MG10, 2026-11-18)

> Written by: Claude

Nine's main has refused its own build since the format epoch-4 pin (0.31.0): `Nine look nine-sky: budget: 195 nodes
(at most 160)`. shard-format `910a518` (0.27+) renamed `validateGraph`'s `trustedBudget` option to `declaredBudget`;
sdk 0.3.8's `checkAuthorGraph` still passes `trustedBudget`, and under Nine's format override the sdk loads format
0.34, so every author graph was checked against the default 160-node budget. `src/generators/authorGraph.ts` calls
`validateGraph(input, { declaredBudget: true })` itself, the sdk's intent; the four callers import it. Remove it when
the sdk Nine pins renames its call.

With it the build reaches the real MG10 gate: `worst loading total bytes 1,814,793,308 > 1,500,000,000` (J408) and
`runtime accounted bytes 547,365,098 > 536,870,912` (OF10c1a). Those are MEMORY-GATES MG10's content cuts, not this fix.
