// QA 2026-11-24 row 52 (J510, and this shard's own rule: "real bars, never cut-out cards"): a railing's bars, a skybridge's
// glazing bars and a gallery's net, built as real wires in an opaque kit instead of an alpha-cut quad painted with them.
import type { Vector3 } from 'three';
import { K, type Kit, type Look } from './kit';

const lerp = (p: Vector3, q: Vector3, t: number): Vector3 => p.clone().lerp(q, t);

/** a bar's radius for a pattern's spacing: fine railing bars, heavier mullions, thin net wire */
function radius(look: Look): number {
  const col = look.col ?? 0.13;
  if (look.kind === K.net) return 0.009;
  return col >= 0.6 ? 0.035 : 0.013;
}

/**
 * The bars a `K.bars` or `K.net` quad painted, as wires over the quad a=(0,0) b=(w,0) c=(w,h) d=(0,h): uprights every
 * `col` metres along a→b (both ends included), rails every `row` metres up from the foot (a `row` of 0: no rails; the
 * railing's top is its kit's own beam), and for a net the same grid both ways at `col`. Each wire is a three-sided prism with
 * ruled long edges (`Kit.wire`), lit and inked like the rest of the kit.
 */
export function barPanel(k: Kit, a: Vector3, b: Vector3, c: Vector3, d: Vector3, w: number, h: number, look: Look, farU = true, farV = true): void {
  const r = radius(look), wire: Look = { wash: look.wash, line: look.line ?? 1, ...(look.wet === undefined ? {} : { wet: look.wet }) };
  const col = Math.max(0.05, look.col ?? 0.13), net = look.kind === K.net;
  const uprights = Math.max(1, Math.round(w / col));
  // `farU` / `farV` false: a net cell leaves its far edges to the next cell's wires
  for (let i = 0; i <= (farU ? uprights : uprights - 1); i++) { const t = i / uprights; k.wire(lerp(a, b, t), lerp(d, c, t), r, wire); }
  const row = net ? col : (look.row ?? 0);
  if (row <= 0) return;
  const rails = Math.max(1, Math.round(h / row));
  // a railing's top is its kit's own rail beam, so its bars' rails stop below it; a net is wired to its edges all round
  for (let j = 0; j <= (net && farV ? rails : rails - 1); j++) { const t = j / rails; k.wire(lerp(a, d, t), lerp(b, c, t), r, wire); }
}

/** `barPanel` over a rectangle from a corner and two unit directions (the `Kit.quad` arguments). */
export function barRect(k: Kit, p0: Vector3, u: Vector3, v: Vector3, w: number, h: number, look: Look): void {
  const b = p0.clone().addScaledVector(u, w), d = p0.clone().addScaledVector(v, h), c = b.clone().addScaledVector(v, h);
  barPanel(k, p0.clone(), b, c, d, w, h, look);
}
