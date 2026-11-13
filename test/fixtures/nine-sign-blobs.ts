// oxlint-disable-next-line import/no-nodejs-modules -- Fixture owns and removes only its isolated source cache.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Use the defining real author root.
import { resolve } from 'node:path';
import { type NamedBlob } from '@wildshard/sharddev/blobs';
import { createProjectGeneration } from '@wildshard/sharddev/projectGeneration';
import { nineSignsProgram } from '../../src/generators/signsProgram';
import { nativeSignAtlas } from './nine-native-atlas';
import { nativeGlyphs } from './nine-native-glyphs';
/** Exercise the same owned source/cache operation as the product writer. */
export async function nineSignBlobs(): Promise<NamedBlob[]> {
  mkdirSync('tmp', { recursive: true }); const cache = mkdtempSync(resolve('tmp', 'nine-sign-blobs-'));
  try { return [...(await nineSignsProgram(createProjectGeneration(resolve('src'), 'f'.repeat(64), new Map(), cache), nativeSignAtlas, nativeGlyphs)).blobs]; }
  finally { rmSync(cache, { recursive: true, force: true }); }
}
