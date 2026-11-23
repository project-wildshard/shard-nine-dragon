import { worldEntryRows as parseWorldEntry } from '@wildshard/sdk/worldScenes';
import { AddEquation, CustomBlending, OneFactor, ZeroFactor } from 'three';
import canopy from '../data/canopy.json' with { type: 'json' };
import light from '../data/light.json' with { type: 'json' };
import { nineWorldInstallRows, type NinePhysicsPlacement } from './physicsPlacements';
import { deckFloorRows } from './floorRows';
import windowBindings from '../data/windowBindings.json' with { type: 'json' };
import type { NineWorldScenes } from './worldScenes';

type WorldEntryRows = ReturnType<typeof parseWorldEntry>;

const deckFloors = deckFloorRows();

/**
 * Nine Dragon Stack's world entry rows (format/worldEntry), per deck ending (`capped` standalone, `open` in a grid cell):
 * the portals, the banyan crown's looks and its dressing root, the square's lions and sets, the fabric and this ending's
 * decks and sign boards, the hung lanterns, the facade's drawn pieces, window bindings and sign boards, the wet floor's
 * reflection cards with the streak and halo looks they draw in, the wall kit and air conditioners, the hook and the crowd
 * (the world assembly's entry stages, generators/worldAssembly.ts), and the square's floor rows (`pieces`, the
 * world/scenes section's entry, run in the entered world once the assembly stands; its solids are prop rows).
 */
function nineEntryBlocks({ worldRows, LAYOUT_PLACEMENTS, LION_PLACEMENTS, SET_PLACEMENTS }: NineWorldScenes): WorldEntryRows['blocks'] {
  // OF21 r6: the walkable square and stacks' floor rows only (footsteps and placement read them). Their solids are the
  // shard's prop collider rows (headless.ts ninePropColliders), which the page and the room both build, so no piece
  // here carries a collider: the assembly built the same solids a second time over the props (engine side-parity).
  const install = nineWorldInstallRows();
  const floors = (variant: 'capped' | 'open', rows: readonly NinePhysicsPlacement[]) => {
    const row = rows.find(entry => entry.id === 'nds-floors'); if (row === undefined) throw new Error('Missing Nine floors piece');
    return { kind: 'piece', when: { variant }, id: row.id, name: row.name, file: row.file, category: 'buildings', surface: 'stone', colliders: [],
      floors: [...worldRows.rows.floors, ...deckFloors], floorPolicy: 'first', solidFloor: true };
  };
  // a world-scene placement put under the world root (scenes.place publishes `<id>.root`), optionally renamed
  const placed = (id: string, name?: string, variant?: 'capped' | 'open') => {
    const when = variant === undefined ? {} : { when: { variant } };
    return [{ kind: 'place', id, ...when }, { kind: 'attach', id: `${id}.root`, as: 'object', ...(name === undefined ? {} : { name }), ...when }];
  };
  const wall = LAYOUT_PLACEMENTS.filter(row => row.id.startsWith('nds-inst-'));
  // under the fabric's facade group: its drawn pieces (worldScenes.ts LAYOUT_PLACEMENTS) and this ending's lit windows
  const facade = (id: string, variant?: 'capped' | 'open') => ({ kind: 'attach', id, as: 'object', parent: 'fabric.facade', ...(variant === undefined ? {} : { when: { variant } }) });
  return parseWorldEntry({ blocks: {
    pieces: [floors('capped', install.standalone), floors('open', install.cell)],
    portals: [{ kind: 'attach', id: 'portals.root', as: 'group' }],
    canopy: canopy.draws.map(draw => ({ kind: 'look', look: draw.look, state: draw.state })),
    dressing: [{ kind: 'attach', id: 'dressing.root', as: 'group' }],
    lions: LION_PLACEMENTS.flatMap(row => placed(row.id)),
    sets: SET_PLACEMENTS.flatMap(row => placed(row.id)),
    // each deck ending's entry decks and the facade's sign boards (worldScenes.ts FIXED_STEPS)
    // the fabric (restored where it was frozen, under the dressing root), then this ending's decks and sign boards
    kits: [{ kind: 'place', id: 'fabric' }, ...(['open', 'capped'] as const).map(variant => ({ kind: 'attach', id: `fixed-${variant}.root`, as: 'group', when: { variant } }))],
    lanterns: (['open', 'capped'] as const).flatMap(variant => placed(`nds-lanterns-${variant}`, 'lanterns', variant)),
    facade: [
      ...worldRows.rows.facade.drawn.flatMap(row => [{ kind: 'place', id: `nds-facade-${row.id}` }, facade(`nds-facade-${row.id}.root`)]),
      ...(['open', 'capped'] as const).flatMap(variant => windowBindings[variant].map(id => facade(id, variant))),
      // every sign hung: copies of the sign model drawn into the dressing's sign and neon-board meshes
      { kind: 'place', id: 'nds-signs' }, { kind: 'place', id: 'nds-signs-neon' },
    ],
    wall: wall.flatMap(row => placed(row.id)),
    figures: [...placed('nds-fei-zhua-hooks'), ...(['walkers', 'sitters'] as const).flatMap(group => worldRows.rows.crowd[group].length === 0 ? [] : placed(`nds-crowd-${group}`, 'crowd'))],
    cards: [
      { kind: 'look', look: 'nine-streaks', state: { transparent: true, blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor,
        blendEquationAlpha: AddEquation, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor } },
      { kind: 'look', look: 'nine-halo', state: light.haloState },
      { kind: 'attach', id: 'cards-capped.root', as: 'group', when: { variant: 'capped' } },
      { kind: 'attach', id: 'cards-open.root', as: 'group', when: { variant: 'open' } },
    ],
  } }).blocks;
}

/** The world/scenes section's entry: the square's floor rows, run in the entered world once the assembly stands. */
export function nineWorldEntry(scenes: NineWorldScenes): WorldEntryRows {
  const pieces = nineEntryBlocks(scenes)['pieces']; if (pieces === undefined) throw new Error('Missing Nine pieces block');
  return parseWorldEntry({ blocks: { pieces } });
}

/** The world assembly's entry blocks (generators/worldAssembly.ts). */
export function nineBuildBlocks(scenes: NineWorldScenes): WorldEntryRows['blocks'] {
  const { pieces: _pieces, ...build } = nineEntryBlocks(scenes);
  return build;
}
