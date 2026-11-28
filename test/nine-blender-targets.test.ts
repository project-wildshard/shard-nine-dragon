import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';

// Meta QA 11-25 row 157: the fp-rig check climbed to a monorepo root and loaded a rig API the SDK's armRig.ts no longer
// had, and targets.json named outputs under a folder this repo doesn't have. Both run here, against the installed SDK.
const SDK = 'node_modules/@wildshard/sdk';

test('every Blender target names files this repo has', () => {
  const out = execFileSync(process.execPath, [`${SDK}/scripts/check-model-sources.mjs`], { encoding: 'utf8' });
  expect(out).toContain('every GLB has a script, no orphans');
});

test('the fp-rig check re-samples all 16 clips from the installed SDK and passes', () => {
  const out = execFileSync(process.execPath, ['--import', `./${SDK}/src/sharddev/headless/scripts/bake-loader.mjs`, 'src/blender/viewmodel/rig/check-clips.mjs'], { encoding: 'utf8' });
  expect(out).toMatch(/\[fp-rig\] 16 clips, worst [0-9.]+°: PASS/u);
}, 60_000);
