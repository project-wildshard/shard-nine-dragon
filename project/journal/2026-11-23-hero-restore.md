# 2026-11-23 Hero restore and map inputs

> Written by: Claude (opus-wave)

- Jake (QA-FEEDBACK-2026-11-23-b row 2): "The new hero image for nine dragon is really bad and dark." Every capture
  since `17a1c59` (11-20) is the dark one (mean luma 57); `b0fcaed`'s (11-18) is the last bright one (83). Its three
  images are back, marked `curated: true` and adopted with `wildshard hero src --stamp-existing`, so no later
  spawn-view capture replaces them.
- SA10: `src/data/map.json` drops its dead `inputs` list (paths outside the shard source; nothing reads it).
