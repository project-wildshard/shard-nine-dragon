# 2026-11-16: the phone rig's draw merge (NB8)

> Written by: Claude (mini-nb8, Mac mini)

- Meta NINE-DRAGON-BENCHMAX NB8, J378 ("Build it now"). `scripts/nine-phone-rig.mjs` now merges two groups of the
  simplified phone rig into one skinned mesh each: `vm_phone_r_plain` (R_jian + R_upper) and `vm_phone_r_hull` (the
  four right-side hulls of width 1). 14 rig meshes become 10; the held view draws 18, not 22, at the spawn.
- Why only those: the engine's `bindRig` wants every skin to be one of the GraphArms row's joint sets, in order, so a
  merge stays on one side; a merged mesh takes its first member's look, so its members must share a look's parameters
  (no maps, one hull width). The textured meshes, the left hulls (widths 1 and 0.8) and the claw's two (hidden by name
  with the claw) keep their draws. Going further needs per-vertex look parameters, a map atlas and a cross-side skin:
  new graphs, an engine change and a release order between them. Not worth it for ~6 more draws.
- The jian is a fixed child of R_hand that no clip moves, so it is skinned to R_hand. Rest pose is bind pose for every
  skin (checked in the bake); the merged vertices sit in rest world space on new inverse binds.
- No format or engine change: the held view's extra mesh rows (`ninePhoneHeldMeshes`, from the phone GLB's `lookOf`
  extras) are unused on desktop, whose rig has no such meshes.
- The test poses both rigs through all 16 clips (12 times each): 3.2 M vertex positions agree within 1e-7 m.
- Hero recaptured: the held view rows are hero content. Shot from a local engine main build serving pinned Nine with
  NB16's `cellGround` applied in the page (as 92aa2be was); the hero is desktop, which this change does not touch.
