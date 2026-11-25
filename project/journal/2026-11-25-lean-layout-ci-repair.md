# The lean move, repaired where CI went red

> Written by: Claude

repo-kit lean-layout R1 changed this repo on its way to the lean layout.
`pnpm check` passed, but CI runs more than check, and some of it named the old
paths. sharddev-55 saw main red and asked for a look. Fixes:

- ci.yml: the `pnpm test:hooks` step is gone (`pnpm check` runs `test:kit`, which holds the hook tests)
- tsconfig.json: no `three` paths (no typecheck here reads the root tsconfig; `wildshard check` lints through it, TS21)
- tsconfig.lint.json is gone, and so is `--tsconfig` on the shard lint
