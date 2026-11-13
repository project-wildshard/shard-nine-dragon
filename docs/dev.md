# Developing shard-nine-dragon

Living doc: commands, layout, code rules and git hooks. AGENTS.md links
here; what the repo does is `docs/prd.md`, how it is built `docs/design.md`.

## Commands

Run from the repo root.

- `pnpm install`: installs deps and points `core.hooksPath` at `.githooks/`.
- `pnpm check`: typecheck + lint + format:check + unit tests + asks. The pre-push hook runs it.
- `pnpm test`: `node:test` on `src/**/*.test.ts`, run as .ts by Node's type stripping.
- `pnpm test:hooks`: the `.githooks/` suite (CI, and pre-commit when hooks change).
- `pnpm lint:fix` / `pnpm format`: the hooks only check; these fix.
- `node kit/cli/main.ts --help`: the CLI without installing it.
- `pnpm md:wrap`: rewraps Markdown prose to ~72 columns.
- `node scripts/nine-phone-rig.mjs [--check]`: bakes the phone tier's
  first-person rig, `fp-rig.phone.glb` (meshoptimizer, 1 mm, ~30 % of
  the triangles), beside the authored `fp-rig.glb`. Checked in: rerun
  it after changing the rig; `test/nine-phone-rig.test.ts` refuses a
  stale copy. The engine's phone tier fetches a
  `name.phone.glb` in place of `name.glb`; the desktop is unchanged.
- `kit/scripts/ask-new.sh "<Jake's words>"`: opens an ask (`docs/tasks/asks/README.md`).

The explicit CI-only route proof runs after a real build:

```sh
node --experimental-transform-types --test test/ci/owned-journey.test.mjs
```

It drives 1,800 actual input ticks, checks waypoint progress and grounded
settling, disposes the real runtime and refuses a later tick. Routes live
in this repo; no quest flags, poses or host state are forced. Each case
keeps a 9.5 s limit and stays outside commit/push hooks.

## Layout

The root stays thin: README.md and AGENTS.md (humans only), CLAUDE.md
(`@AGENTS.md`), package.json, pnpm-lock.yaml, .npmrc, .gitignore,
.editorconfig, `docs/`, `project/`, `src/` and the dot dirs. Scratch
goes in `tmp/<task>/` and is deleted when done.

- `kit/cli/`: the CLI (`--version`, `--help`; commands arrive with the import).
- `kit/test/helpers/`: shared test helpers; `git.ts` makes real git repos in temp dirs.
- `src/scripts/`: repo tooling (asks, md-wrap), plain JS.
- `docs/`: living docs. `docs/plans/` is the queue, `docs/tasks/asks/`
  the receipts.
- `project/`: history. `journal/`, `origins/` (the meta-repo plans this
  repo came from), `archive/`.

## Code rules

- TypeScript only, imports with explicit `.ts`/`.tsx` extensions.
- Every function has an explicit return type. `kit/.oxlintrc.json` denies
  every category (D28); disable a rule only with a one-line reason beside it.
- Pin dependencies exactly (`.npmrc` has `save-exact=true`).
- Other Wildshard repos are git dependencies pinned by tag
  (`github:project-wildshard/<repo>#vX.Y.Z`). They are private, so CI reads
  them with the org GitHub App token.
- Tests use real things (git in temp dirs, real files and processes); never
  mock git. No LLM, `claude`, herdr or network in tests.

## Git hooks

| Hook | Checks | Bypass |
| --- | --- | --- |
| commit-msg | Conventional Commits subject ≤ 50, body ≤ 72, one `Assisted-by: AGENT:MODEL` trailer, no AI `Co-Authored-By` | `SKIP_ATTRIB=1` (human-only commit) |
| pre-commit | `main` in the main checkout (D27), staged set echo, whitespace, 1 MB cap, credentials, sh / mjs syntax, new-plan Status line, journal (D25) | `ALLOW_BRANCH=1`, `ALLOW_BIG=1`, `ALLOW_SECRET=1`, `SKIP_JOURNAL=1` |
| pre-commit | lint + format:check on staged code, typecheck; 8 s budget | `SKIP_BUDGET=1` (time only), `SKIP_CHECK=1` |
| pre-push | outgoing commits: size, credentials, syntax; then `pnpm check` | `ALLOW_BIG=1`, `ALLOW_SECRET=1`, `SKIP_CHECK=1` |

Bypasses are for the case they name, never for a red gate: fix the code,
not the gate.

## J198 prepared publications

Builds emit drafts. Before publishing new bytes, run the packing recipe
through the engine browser lane with the exact preparation preview:

```sh
WILDSHARD_PREPARATION_URL=http://127.0.0.1:<preview-port> \
  ../engine/scripts/browser-lane.sh pnpm pack:shards
```

The recipe refuses an unprepared draft without that URL, or measures the
draft in a fresh phone WebKit context before packing. The candidate must
be the one admitted by that preview. Already prepared products can be
packed again. Final engine cook refuses a different renderer. Format and
SDK are immutable Git pins; generic legacy archive repair is separate.
An API revision is published only after its validator accepts this SDK
version. A local prepared tar is not a new published head.

## Global-store trial

The root default remains off until the ordered GVS rollout.
An isolated trial uses `pnpm install --frozen-lockfile
--config.ci=false --config.enableGlobalVirtualStore=true`.
Hosted CI installs the real store and configures its cache; runner CI stays true.
The engine0.1.2 extension declares its installed author-tool dependencies;
source pins and package resolution records stay unchanged.
The literal dev command still refuses its generation-inventory root before
browser startup. A build or headless play proof does not close that gap.
