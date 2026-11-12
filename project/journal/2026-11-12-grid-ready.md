# grid-ready

- Added `test/ci/grid-ready.test.mjs` (meta TEST-COVERAGE SH-nine-2, J186,
  CI only): the built Nine product admits as a cell of the pinned engine's
  shipped grid through the public `GridSimulation` and trusted-runtime
  exports. Runtime fence, real-input walk, refused and durable checkpoints,
  frozen-when-left, unload, and a restore that keeps the walked pose and
  regional continuation. About 0.5 s locally. The highway is a second Nine
  world because the grid server's road is not exported.
