import { expect, test } from 'vitest';
import bindings from '../data/lookBindings.json' with { type: 'json' };
import { architectureGraphs, crowdGraph } from './architectureGraphs';
import { kitKindFiles } from './kitKindGraphs';
import { withRestingParams } from './frameChannels';

// QA 11-24 row 9 (Jake: "ITS THAT ITS ALL BLACK"): where no post-graph look feeds the frame channels (a data cell in the
// grid, a `wildshard dev` page) the bound looks draw from their params' own values, so those must be the lit resting
// values, never the 0 that drew the whole city black.
const PAINT = ['uPaintK', 'uPaintStone', 'uShade', 'uWashTint', 'uPaper', 'uWinWarm'] as const;

function values(graph: { readonly params?: Readonly<Record<string, { readonly value: unknown }>> }, name: string): number[] {
  const value = graph.params?.[name]?.value;
  return (Array.isArray(value) ? value : [value]).map(Number);
}

test('the bound architecture looks rest lit, not black', () => {
  const graphs = architectureGraphs();
  for (const id of ['nine-architecture', 'nine-architecture-cut', 'nine-facade', 'nine-coarse-facade']) {
    const graph = graphs[id];
    if (graph === undefined) throw new Error(`no graph ${id}`);
    const rested = withRestingParams(id, graph);
    for (const name of PAINT) {
      if (rested.params?.[name] === undefined) continue;
      const v = values(rested, name);
      expect(v.every(Number.isFinite), `${id}.${name} finite`).toBe(true);
      expect(Math.max(...v), `${id}.${name} rests above 0`).toBeGreaterThan(0);
    }
    if (rested.params?.['uPaintK'] !== undefined) expect(values(rested, 'uPaintK').some(n => n > 0), `${id} paints`).toBe(true);
  }
});

test('the crowd and kit kinds rest lit', () => {
  expect(Math.max(...values(withRestingParams('nine-crowd-table', crowdGraph()), 'uShade'))).toBeGreaterThan(0);
  for (const file of kitKindFiles(withRestingParams)) {
    const graph = JSON.parse(new TextDecoder().decode(file.bytes)) as Parameters<typeof values>[0];
    if (graph.params?.['uShade'] !== undefined && bindings.graphs.includes(file.look)) expect(Math.max(...values(graph, 'uShade')), file.look).toBeGreaterThan(0);
  }
});

test('an unbound look keeps its own params', () => {
  const graph = { version: 1, params: { uShade: { type: 'vec3', value: [0, 0, 0] } } } as unknown as Parameters<typeof withRestingParams>[1];
  expect(withRestingParams('not-bound', graph)).toBe(graph);
});
