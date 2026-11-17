import { expect, test } from 'vitest';
import { beforePortalClearance } from './fixtures/portal-rail-history';
import { unsortedPath } from './fixtures/legacy-path';
import { hashImmutableBytes } from '@wildshard/engine/host/immutable';
import { portalFloorRows, deckCapRows } from '../src/generators/portalFloors';
import { portalEntryRows, portalPlanRows } from '../src/generators/portalEntries';
import { ninePhysicsPlacements, nineWorldInstallRows } from '../src/generators/physicsPlacements';
import { floorBoxRows } from '../src/generators/floorBoxes';
import { frontRows } from '../src/generators/fronts';
import { ninePhysics } from '../src/generators/physics';
import { stairPlanData } from '../src/generators/stairPlan';

// Captured from ea96805666's original registered outputs before replacing file handoffs.
// NET-LAG (2026-11-17): the four rows carrying the floor boxes now include the balustrade's stone (floorBoxes.ts).
// Signed zero is explicit here, so importing source cannot silently change a JSON-normalized coordinate.
const originals = [
  { id: 'nine-physics', build: ninePhysics, bytes: 91715, hash: '38aec34942ff9047d910653a7b98a4ad716a5c521b0ad6dc4862f33694703739' },
  { id: 'nine-portal-floors', build: portalFloorRows, bytes: 1964, hash: 'fa481bc46f7f65b990a77f9fa20f8f31796713e8866a216df780021cc8faf483' },
  { id: 'nine-portal-entries', build: portalEntryRows, bytes: 2134, hash: '5594bddd8345d7f1bb1048ea411b50a0bf22317ad31a1930dadf1f4d4cde5d24' },
  { id: 'nine-fronts', build: frontRows, bytes: 826, hash: '9864d72db08b6ff8a2183787bed50c4235fa510c6c9bc1c257330b13ba899fa6' },
  { id: 'nine-floor-boxes', build: floorBoxRows, bytes: 1439, hash: '53dea3f272f7826790628cb1078ddb91470f385573cc026f29e6a579c94b7448' },
  { id: 'nine-deck-caps', build: deckCapRows, bytes: 1815, hash: 'db76684de1f11ddeff7300cf12fad9b7004e50a02761b734feea1f5407d065d1' },
  { id: 'nine-stair-plan', build: stairPlanData, bytes: 398, hash: '8cb3a75c38e40050ca033046f40a54f4bc061452d05b459d79b3d3ee6df98799' },
  { id: 'nine-physics-placements', build: ninePhysicsPlacements, bytes: 7654, hash: '21b26ab9aa46b9fdf7fa6908891dba76f33d066e80d928fe838c4a337804474f' },
  { id: 'nine-portal-plan', build: portalPlanRows, bytes: 597, hash: 'ae06cb30a7118e8f6bd1bd000cec3a512aa43e7db401f4787ba1d94743aa9899' },
  { id: 'nine-world-install', build: nineWorldInstallRows, bytes: 13719, hash: 'd5dd2733814a24b88f43c79a684ac5e55d4b4f5e1a02054d03707bb1ce603f52' },
] as const;

test.each(originals)('$id preserves the original complete row payload', row => {
  // A row's `file` is compared by side-free identity: the sort and later retags move files, not rows.
  const bytes = new TextEncoder().encode(JSON.stringify(beforePortalClearance(row.build(), row.id === 'nine-world-install' ? 16 : ['nine-physics', 'nine-portal-floors', 'nine-physics-placements'].includes(row.id) ? 8 : 0), (key, value: unknown) => Object.is(value, -0) ? '-0'
    : key === 'file' && typeof value === 'string' ? unsortedPath(value) : value));
  expect(bytes.byteLength).toBe(row.bytes);
  expect(hashImmutableBytes(bytes)).toBe(row.hash);
});
