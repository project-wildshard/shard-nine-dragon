# Checkpoint baselines per platform (SH-ALL-13)

J97: Pine and Far Reach drifted without anyone seeing, because the old
checkpoint compare ran on darwin only. Since the lift, `product-play`
only checks that a resumed save continues identically within one run.
That is true on any platform, so a change in what the world does after
a walk was never compared with anything.

## What changed

`test/ci/checkpoint-baseline.mjs` hashes the opaque snapshot of the
checkpoint after the 241-tick walk (sha256 of its bytes, never its
layout). It compares that hash with
`test/ci/checkpoint-baselines.json`, keyed by `<engine version>
<platform>-<arch>` and then by slug.

- Each platform keeps its own value, since Rapier and float math may
  differ.
- A missing entry fails, so a new platform or engine version can't
  silently skip the check.
- `CHECKPOINT_BASELINE=record` writes this platform's row.
- The CI failure message prints the exact entry to add, which is how
  linux-x64 gets its value. No Linux box or working Docker is at hand,
  and a local container would be arm64 anyway.

darwin-arm64 gave the same hash on two runs and on a fresh worktree
build. A tampered value fails with "drifted".

## The cost

Every engine bump now needs both rows re-recorded. That is the point:
the drift becomes a visible diff instead of something nobody notices.
