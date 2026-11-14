import type { NineNavigation } from './navigationProgram';
import type { GeneratedProject, ProjectGenerationContext } from '@wildshard/sharddev/projectGeneration';
import { readNineShardfileInputs } from './shardfile';
import { nineShardfileFrom } from './shardfileDefinition';
import { NINE_MOVERS_CONTRACT } from './moversProgram';
import { nineSourceOutput } from './sourceOutput';
import type { NineOutput } from './outputDefinition';
import { nineBootProgram } from './bootDiscovery';
import { nineMap } from './mapProgram';

/** Strong output shape shared by the CLI and direct function tests. */
export interface NineGeneratedProject extends GeneratedProject { readonly output: NineOutput; readonly discovery: { readonly navigation: NineNavigation } & ReturnType<typeof nineBootProgram> }

/** The source invocation owns its executable, fresh entry evidence and native decal bytes. */
export async function generate(ctx: ProjectGenerationContext): Promise<NineGeneratedProject> {
  const boot = nineBootProgram(ctx);
  const inputs = await readNineShardfileInputs(ctx);
  const shard = nineShardfileFrom(inputs, { pages: NINE_MOVERS_CONTRACT.pages });
  const output = await nineSourceOutput(ctx, { courseProgram: inputs.courseProgram, casts: inputs.casts, signs: inputs.signs, held: inputs.held, ownedWorld: inputs.ownedWorld, scenes: inputs.scenes, construction: { seed: shard.identity.seed, looks: Object.keys(shard.look.materials) } });
  return { shard, output, map: { pixels: await nineMap(ctx, inputs.casts.raw), name: 'ui/images/map' }, discovery: { navigation: inputs.navigation, ...boot } };
}
