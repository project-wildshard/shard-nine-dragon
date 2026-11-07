import type { Scope } from '@wildshard/engine/app/scope';
import { ReturnProgram } from '@wildshard/engine/game/population/returnProgram';
import { ninePracticeBytes, ninePracticeRows } from './nine-practice-product';

const assets = new Map([[ninePracticeRows.script.module.slice('blobs/wasm/'.length, -'.wasm'.length), ninePracticeBytes]]);
/** The same admitted byte map lent to the test's actual existing native owner. */
export function lendNinePractice(owner: Scope): void { ReturnProgram.lendModules(owner, assets, [ninePracticeRows.script]); }
