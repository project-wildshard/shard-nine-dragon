# Run the packed SDK cook through current engine exports

> Written by: Codex
>
> **State** · local cook and runtime proofs pass, 2026-11-18.

The 0.1.42 engine exposes native folders through the SA25 names.
Nine's retained runtime proofs call those exports. The package and
cook tests use the dev package's released command entry point.

The rebuilt native assembly proves 92 lanes and eight portal
transfers in 15,952 ticks. The local checkpoint was recorded and
verified on Darwin arm64. The installed author graph, native tests,
1,800-tick route, real server-only cook, portal, well crossing and
grid restore all pass locally.

Hosted Ubuntu recorded the same checkpoint digest on the installed
0.1.42 engine and reached the comparison after boot and walk.
The baseline now records that digest for both platforms.
[Hosted runtime proof](https://github.com/project-wildshard/shard-nine-dragon/actions/runs/44372211567/job/135041758906).
