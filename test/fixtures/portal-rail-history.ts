/** NB20 (4264fe9864) moves eight parapet inner faces 5 cm outwards.
 * Check those exact new words, then reconstruct only their former words so
 * all original payload pins still cover every unchanged collider and field. */
export function beforePortalClearance<T>(input: T, expected: number): T {
  const result = structuredClone(input); let rails = 0;
  function visit(value: unknown): void {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const row = value as Record<string, unknown>;
    if (row['kind'] === 'box' && row['surface'] === 'stone' && row['y'] === 0.55) {
      for (const [axis, half] of [['x', 'hx'], ['z', 'hz']] as const) {
        const center = row[axis];
        if (typeof center === 'number' && Math.abs(center) === 4.324999999999999) {
          if (row[half] !== 0.2749999999999999) throw new Error('NB20 parapet half width differs');
          row[axis] = Math.sign(center) * 4.3; row[half] = 0.2999999999999998; rails++;
        }
      }
    }
    Object.values(row).forEach(visit);
  }
  visit(result);
  if (rails !== expected) throw new Error(`NB20 parapet count ${rails} differs from ${expected}`);
  return result;
}
