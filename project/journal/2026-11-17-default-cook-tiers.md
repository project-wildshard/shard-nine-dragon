> Written by: Codex
> State: verified, 2026-11-17.

Mini QA41: engine 0.1.32 includes the per-worker format hook, so Nine's
Ring 2 cook-to-play proof no longer turns phone tiers off to avoid the
old installed-package failure. Runtime and pins are unchanged.

The real pinned-engine cook with default phone tiers passed locally:
149.89 seconds cooking, 153 server files, 38 client parts; grapple earned
and five restored ticks using only extracted cooked server files. The
original 300-second case deadline stays. Engine's fresh-package test also
reproduces the old hook failure and heals it in a disposable install.
