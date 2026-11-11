# One agent layout for Claude Code and Codex

Jake asked for every repo to work with both tools from one source.
This repo is the pilot for meta MULTI-AGENT-TOOLING (rows MA3 and MA6),
stamped from repo-kit `a182d3d` with
`node ../repo-kit/scripts/agent-sync.mjs --from ../repo-kit`.

Skills now live in `.agents/skills/`, where Codex reads them, and each
`.claude/skills/<name>` is a link to that directory. The hook scripts
moved to `.agents/hooks/`. They find the repo with git, and they read
either tool's hook input through `lib/payload.mjs`. `.agents/hooks.json`
declares the hooks once. `scripts/agent-sync.mjs` writes Claude's
settings hooks and `.codex/hooks.json` from it. The session brief and
plan-overview read the repo name at run time, so they are the kit's
bytes here too.

`pnpm check` now runs `check:agent-sync`, `test:agent-hooks` (each hook
on recorded Claude and Codex payloads, plus shellcheck 0.11.0, which CI
installs by checksum) and `check:parity --strict`. The kit's hook tests
and `lib.mjs` come from leftover `4e04b01`, which finds the scripts in
either layout; the old width-hook tests left `md-wrap.test.mjs`.

Codex loads `.codex/hooks.json` only once this checkout is trusted in
`~/.codex/config.toml`. That is Jake's call (plan decision 2). Until
then, the Codex half is written but does not run.

A pathspec commit cannot turn a tracked skill directory into a link
(the old paths sit beyond the link), so the swap is staged in the
index and amended in whole.
