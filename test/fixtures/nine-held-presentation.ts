import { inputs } from './nine-shardfile-inputs';
import aim from '../../src/data/grapple.json' with { type: 'json' };
import bursts from '../../src/data/burstFields.json' with { type: 'json' };
import filament from '../../src/data/filament.json' with { type: 'json' };
import light from '../../src/data/light.json' with { type: 'json' };
import vm from '../../src/data/viewmodelUniforms.json' with { type: 'json' };
import { filamentGeometry } from '../../src/generators/filamentGeometry';
import { parseBurstFields, parseFilamentRows, parseHaloState } from '../../src/generators/sections';
import { heldView } from '../../src/generators/heldView';
import { postRows } from '../../src/generators/postGraphs';
import { postGraphRow } from '../../src/generators/composite';
import { NINE_FRAME_CHANNELS, NINE_FRAME_GROUP } from '../../src/generators/frameChannels';

/** Entry fixtures lend the complete authored document at the same named-file
 * boundary as the producer, including the native view and post contracts. */
export function nineHeldPresentationBytes(): Uint8Array {
  const row = { portraitFov: 78,
    aim: { ...aim, ribbon: filamentGeometry(aim.ropePoints), filament: parseFilamentRows(filament), filamentState: parseHaloState(light.haloState) },
    bursts: parseBurstFields(bursts), view: heldView(inputs.held),
    look: { vm, post: { ...postGraphRow(postRows()), channels: { group: NINE_FRAME_GROUP, programs: NINE_FRAME_CHANNELS } } } };
  return new TextEncoder().encode(JSON.stringify(row, (_key, value: unknown) => typeof value === 'number' && Object.is(value, -0) ? '-0' : value));
}
