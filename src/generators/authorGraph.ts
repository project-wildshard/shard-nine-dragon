import { validateGraph } from '@wildshard/format/materialGraph';

/**
 * An offline author graph under the author's declared budget. sdk 0.3.8's `checkAuthorGraph` still passes the format's
 * old `trustedBudget` option, which format 0.27+ calls `declaredBudget` (shard-format 910a518), so under Nine's format
 * pin it validated every graph against the default 160-node budget and refused the build (nine-sky, 195 nodes).
 * Remove once the sdk Nine pins renames its call.
 */
export function checkAuthorGraph(input: unknown): ReturnType<typeof validateGraph> {
  return validateGraph(input, { declaredBudget: true });
}
