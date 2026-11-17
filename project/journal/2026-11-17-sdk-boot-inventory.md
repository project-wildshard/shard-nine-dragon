# Retire the SDK 0.3.4 boot workaround

> Written by: Codex
> **State:** implemented, 2026-11-17.

NB18 moved Nine to SDK 0.3.8, which includes the node-safe
bootInventory helpers. The shard still duplicated filePolicy and
hard-coded the Rapier URL to avoid 0.3.4's split author bundle.
Use bootFilePolicy and sharedBootPhysics from the pinned SDK and
remove the corresponding shard-sandbox ratchet debt (mini QA37).

Captured the former recipe before editing and compared all four
phone/desktop image/KTX2 results against the replacement, including
GPU aliases, phone fallbacks and absent world files: identical.
The temporary parity test passed and was removed after the proof.
Build and wildshard check verify the original one-module refusal.
No dependency, manifest, hero, pin or renderer changes.
