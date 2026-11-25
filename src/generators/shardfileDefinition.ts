import type { NineSourceCasts } from './castsProgram';
import type { NineSourceSigns } from './signsProgram';
import type { NineSourceWorld } from './worldProgram';
import type { NineSlabScenes } from './slabs';
import { nineSlabSourceFiles, nineSlabTransport, nineSlabProps } from './refinementAdmission';
import type { NineNavigation } from './navigationProgram';
import type { NinePracticeProgram } from './practiceProgram';
import type { NineHeldInputs } from './heldGraphFiles';
import { filamentGraph } from './filamentGraph';
import { haloGraph } from './haloGraph';
import { architectureGraphs } from './architectureGraphs';
import { KIT_KINDS } from './kitKinds';
import { kitKindFiles } from './kitKindGraphs';
import { CROWD_LOOK, crowdGraphFile } from './crowdGraph';
import { withRestingParams } from './frameChannels';
import { burstGraphs } from './burstGraphs';
import { streakGraph } from './streakGraph';
import plumbing from '../data/plumbing.json' with { type: 'json' };
import { nineAudioForScenes } from './audio';
import NINE_MODES from '../data/modes.json' with { type: 'json' };
import { headlessConstants, ninePropColliders } from './headless';
import { emptyShardfile } from '@wildshard/sdk/author';
import { lowerMaterialGraphs } from '@wildshard/sdk/internal/materialGraphFiles';
import { parseShardfile, type Shardfile } from '@wildshard/format/shardSchema';
import NINE_ITEMS from '../data/items.json' with { type: 'json' };
import ledgerRows from '../data/ledger.json' with { type: 'json' };
import { parseLedgerRules } from '@wildshard/sdk/ledger';
import portalStages from '../data/portalStages.json' with { type: 'json' };
import { portalEntryRows } from './portalEntries';
import lookGraphs from '../data/lookGraphs.json' with { type: 'json' };
import presentationGraphs from '../data/scrollGraph.json' with { type: 'json' };

const NINE_LEDGER = parseLedgerRules(ledgerRows);
const portalEntries = portalEntryRows();
const { id: _tool, course: { mode: _mode, ...course }, ...grappleProfile } = headlessConstants.grappleProfile;
const grapple = { id: 'fei-zhua', profile: { ...grappleProfile, course }, hooks: headlessConstants.hooks, guard: 'nds-grapple-guard', rise: true };
const authoredJian = NINE_ITEMS.rows.find(row => row.kind === 'weapon');
if (authoredJian === undefined) throw new Error('Missing authored Jian');
const { profile: strike, ...jian } = authoredJian;
const firstSlash = strike.moves.combo[0];
if (firstSlash === undefined) throw new Error('Missing authored Jian strike');
const items = { ...NINE_ITEMS, rows: [{ ...jian, family: 'kit.melee', view: { ...jian.view, recipe: 'kit.sword' },
  light: { ...jian.light, damage: strike.damage * firstSlash.damage, cooldown: firstSlash.total + strike.cooldown, range: strike.reach, width: 0.35 },
  heavy: { ...jian.heavy, damage: strike.damage * strike.moves.heavy.damage, cooldown: strike.moves.heavy.total + strike.cooldown, range: strike.reach, width: 0.55 } }],
  loadout: { ...NINE_ITEMS.loadout, tools: [] } };
const modes = { ...NINE_MODES, grapple: [{ ...NINE_MODES.grapple[0], ...grapple }] };

// The trusted runtime preserves today's fragment geometry; audio is selected by its declared section. G285: its two feats
// are ledger rows (data/ledger.ts) the runtime emits as they are played (world/feats.ts); the platform grants each once.
// G224 (Jake): Nine Dragon's four road-height decks each carry a portal to Lantern Square, and the square's one portal out
// sends you back to the deck you came in by. Each entry is a `portalLink` (SF8c, src/game/shardfile/portalLink.ts): the
// road portal on its deck, the square's arrival, the square's exit bound back to that road, and the walked route between
// (world/portalPlan.ts `portalLinks`). The floors they bind are this file's `props.colliders` (the generated portal-floor rows: each whole deck, `deck.<edge>`, and the square's slab, `square`), the very boxes the trusted runtime
// installs under those ids (world/install.ts), so its ride (world/portalRide.ts) is the format's checked transfer.
const DEFAULT_MOVERS = { pages: 1 };

/** Owned source results consumed by the declaration in this same build. */
export interface NineShardfileInputs {
  readonly casts: NineSourceCasts;
  readonly signs: NineSourceSigns;
  readonly ownedWorld: NineSourceWorld; readonly scenes: NineSlabScenes;
  readonly held: NineHeldInputs;
  readonly courseProgram: NinePracticeProgram;
  readonly navigation: NineNavigation;
  readonly world: { readonly shardfile: { readonly library: readonly string[]; readonly files: readonly NineInputFile[]; readonly tiles: unknown }; readonly props: Readonly<Record<string, unknown>> | null | undefined };
}

/** Raw file metadata retains its original final parseShardfile admission. */
interface NineInputFile {
  readonly hash: string; readonly kind: string; readonly compressed: number; readonly decoded: number;
  readonly gpu: number; readonly triangles: number; readonly draws: number;
  readonly dependencies: readonly string[]; readonly critical: boolean;
}

/** Assemble the declaration from owned world/navigation/course results and the fixed-page view contract. */
function nineShardfileDeclaration(inputs: NineShardfileInputs, movers: { readonly pages: number } = DEFAULT_MOVERS) {
const { courseProgram, navigation, world, held: { files: heldGraphFiles } } = inputs;
const fine = nineSlabSourceFiles(inputs.scenes.NINE_WORLD_SCENES.libraries, inputs.scenes.NINE_REFINEMENT_SOURCE);
const worldFiles = world.shardfile.files.filter(file => !fine.has(file.hash));
const worldLibrary = world.shardfile.library.filter(hash => !fine.has(hash));
const base = emptyShardfile({ slug: 'nine-dragon-stack', name: 'Nine Dragon Stack', author: 'Wildshard', revision: 1, seed: 0x9d2a });
const kinds = kitKindFiles(withRestingParams), crowd = crowdGraphFile(withRestingParams);
const library = new Set([...worldLibrary, ...heldGraphFiles.library, ...kinds.map(row => row.file.hash), crowd.file.hash]), charged = [...world.shardfile.files.filter(file => library.has(file.hash)), ...heldGraphFiles.files, ...kinds.map(row => row.file), crowd.file];
const courseBytes=courseProgram.blob.bytes.byteLength, courseMemory=courseBytes+courseProgram.script.pages*65536*2;
const navigationResident = navigation.files.reduce((sum, file) => sum + file.decoded, 0);
// the movers view module's memory (behaviour/movers.as, its pages twice: the client lane's image and its rewind copy)
const viewMemory = movers.pages * 65536 * 2;
// OF21: as an ordinary upload Nine's library meets the format's 8 MB default library allowance, which refuses it.
// Nine records its own line instead (J439/J444: new content moves the line; J437: never cut content to fit an old
// number): this definition's library bytes on 2026-11-20, to which the build adds each later step's growth. Re-recorded
// 2026-11-25 for QA 11-25 row 46 (J519): the banyan leaf cards are back and the real bars stay, 70.8 MB built. Re-record
// it when the definition's library grows; the hard ceiling is a shard's 100 MB phone download (J338).
const NINE_LIBRARY_ALLOWANCE = 12_106_054;
const budgets = { ...base.budgets, tier: 'large' as const, sim: { resident: navigationResident+courseMemory, compressed: navigation.files.reduce((sum, file) => sum + file.compressed, 0)+courseBytes }, library: { compressed: charged.reduce((sum, file) => sum + file.compressed, 0), resident: charged.reduce((sum, file) => sum + file.decoded + file.gpu, 0) + viewMemory, downloadAllowance: NINE_LIBRARY_ALLOWANCE } };
// parseShardfile admits each link against the format's PortalLink schema (strict nodes, bound links, the walked route)
return { ...base, plumbing, budgets, navigation: navigation.navigation, critical: navigation.critical,
  // OF31h4: the measured awake tick cost with one player in (engine COST table, SC8)
  serverBudget: { ...base.serverBudget, awakeMicros: 630, memory: base.serverBudget.memory + navigationResident+courseMemory },
  files: [...worldFiles, ...navigation.files, ...heldGraphFiles.files, ...kinds.map(row => row.file), crowd.file].sort((a, b) => a.hash.localeCompare(b.hash)), tiles: nineSlabTransport(world.shardfile.tiles, world.shardfile.files, inputs.scenes.NINE_WORLD_SCENES.libraries, inputs.scenes.NINE_REFINEMENT_SOURCE), library: [...library],
  accent: 'iris', audio: nineAudioForScenes(inputs.scenes), modes, items, ledger: NINE_LEDGER, spawn: { x: 0.95, y: 125, z: 7.5, yaw: -12 * (Math.PI / 180) },
  entryways: portalEntries, directors: [portalStages],
  // QC1 (E510): the city is in view from everywhere and its whole L0 is 81.6 MB of GPU, so the whole cell stays resident
  // as Far Reach's does: no tile retires in play, and no retire re-joins a held refine union mid-walk
  ring: 'cell',
  // the look.materials graphs (data/lookGraphs.json: the sky, the Well's silk sheets, the steam), lent by plugin.ts
  look: { ...base.look, materials: { ...base.look.materials, ...Object.fromEntries(Object.entries({ ...lookGraphs, ...presentationGraphs, ...architectureGraphs(), 'nine-streaks': streakGraph(), 'nine-halo': haloGraph(), 'nine-filament': filamentGraph(), ...burstGraphs() }).map(([id, graph]) => [id, { family: 'graph' as const, graph: withRestingParams(id, graph) }])), ...heldGraphFiles.materials, ...Object.fromEntries(kinds.map(row => [row.look, row.material])), [CROWD_LOOK]: crowd.material } },
  // NR12: the props family draws only the coarse L1 parents (the whole libraries draw the L0 and library pieces), so it is
  // the coarse graph: the towers past the ring read as walls and lit rooms, not flat pbr slabs
  props: { ...nineSlabProps(world.props, inputs.scenes.NINE_WORLD_SCENES.libraries, inputs.scenes.NINE_REFINEMENT_SOURCE), family: 'nine-coarse-facade', wholeLibrary: worldLibrary, colliders: ninePropColliders(),
    // EP12: the props GLB materials by look (scene.ts names them): L0 and the coarse L1 copy draw with the city's own graphs; the
    // shells keep the coarse facade look, whose lit block windows read as Nine at night (G941 board ruling, D)
    materials: { shape: { id: 'nine-coarse-facade' }, kit: { id: 'nine-architecture' }, 'kit-cut': { id: 'nine-architecture-cut' }, ...Object.fromEntries(KIT_KINDS.map(row => [row.material, { id: row.look }])), facade: { id: 'nine-coarse-facade' } } } };
}

/** Lower unchanged graph bytes into immutable files before admitting the larger collision section. */
export function nineShardfileProduct(inputs: NineShardfileInputs, movers: { readonly pages: number } = DEFAULT_MOVERS): { shard: Shardfile; assets: ReadonlyMap<string, Uint8Array> } {
  const lowered = lowerMaterialGraphs(nineShardfileDeclaration(inputs, movers));
  return { shard: parseShardfile(lowered.declaration), assets: lowered.assets };
}

export function nineShardfileFrom(inputs: NineShardfileInputs, movers: { readonly pages: number } = DEFAULT_MOVERS): Shardfile {
  return nineShardfileProduct(inputs, movers).shard;
}
