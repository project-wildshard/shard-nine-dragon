// oxlint-disable-next-line import/no-nodejs-modules -- Run the retained executable through its released host.
import { readFileSync } from 'node:fs';
import courseSource from '@wildshard/sharddev/commons/scripts/course.as?raw';
import { courseProgramInputs } from '@wildshard/sharddev/commons/courseProgram';
import { admitScriptContract } from '@wildshard/format/scriptContract';
import { hashImmutableBytes } from '@wildshard/format/immutable';

export const ninePracticeBytes = new Uint8Array(readFileSync('test/fixtures/nine-practice-course.wasm'));
const script = courseProgramInputs('checkpoints', {}, {
  module: `blobs/wasm/${hashImmutableBytes(ninePracticeBytes)}.wasm`,
  sourceHash: hashImmutableBytes(new TextEncoder().encode(courseSource)),
}).row;
admitScriptContract(ninePracticeBytes, { abi: 1, pages: script.pages });
export const ninePracticeRows = { script, bytes: '' };
