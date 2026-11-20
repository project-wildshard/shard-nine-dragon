# Nine Dragon moves to the one format (ONE-FORMAT OF21)

> Written by: Claude (opus-of21-drift)

Nine Dragon was the last shard with a client-plan runtime binding its
props, items, ledger and modes. It now ships as an ordinary upload:
collision is plain prop rows, the Jian is a `kit.melee` row with the
`kit.sword` view, the Fei Zhua grapple and the portals ride M7's
primitives, and `shardfile` names the shard file. The practice course
stays parked.

The candidate is codex-netlag's diff, held through opus-of9b, opus-of22
and opus-of22b. It waited on engine v0.1.53: `wildshard check` needs
`e9068f78e` (the author worker rides plan portals), which v0.1.52 lacks.

Pins: engine 0.1.53, SDK 0.4.17, format 0.54.0 (the engine's own).
Proof on the MacBook: build, `wildshard check` pass, 27 of 27 vitest
files, ci21 8 of 8, owned, portal, grid-ready, well-crossing and
cook-play journeys pass; product-play records its walk checkpoint for
0.1.53 (darwin and linux carry the same digest).

## SDK 0.4.18 (opus-of21-drift2)

SDK 0.4.18 reached npm, so the pins move to it (cli, dev, sdk) and to the
format it pins, 0.55.0, beside engine 0.1.53 from npm `next`; the lockfile
now resolves from npm, not the packed engine. The whole CI set passed
locally on the new pins and the product-play checkpoint kept its digest.

## Library allowance (opus-of21-drift2, 2026-11-20)

The first staging upload (publish run 44681354500) was refused with
`perf-library-download-budget`: 66.2 MB of library against the format's
8 MB default. Nine now records its own allowance (the definition's
12.1 MB, plus each build step's growth: 66.2 MB built), under the 100 MB
phone ceiling (J338). The content is not cut (J437, J444). The hero was
recaptured on the v0.1.53 devserver client; it shows the same frame.
