const EPS = 1e-3;

export function mergeIntervalsLoHi(blocks: readonly { readonly lo: number; readonly hi: number }[]): { lo: number; hi: number }[] {
  if (blocks.length === 0) {
    return [];
  }
  const sorted = [...blocks].sort((a, b) => a.lo - b.lo);
  const out: { lo: number; hi: number }[] = [];
  let cur = { ...sorted[0]! };
  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (b.lo <= cur.hi + EPS) {
      cur.hi = Math.max(cur.hi, b.hi);
    } else {
      out.push(cur);
      cur = { ...b };
    }
  }
  out.push(cur);
  return out;
}

/** Возвращает непересекающиеся отрезки [lo, hi] \ ∪ blocks (blocks сливаются). */
export function subtractIntervalsFromRange(
  lo: number,
  hi: number,
  blocks: readonly { readonly lo: number; readonly hi: number }[],
): [number, number][] {
  if (hi - lo < EPS) {
    return [];
  }
  const merged = mergeIntervalsLoHi(blocks);
  let cur = lo;
  const out: [number, number][] = [];
  for (const b of merged) {
    if (b.hi <= lo || b.lo >= hi) {
      continue;
    }
    const bl = Math.max(lo, b.lo);
    const br = Math.min(hi, b.hi);
    if (cur + EPS < bl) {
      out.push([cur, bl]);
    }
    cur = Math.max(cur, br);
  }
  if (cur + EPS < hi) {
    out.push([cur, hi]);
  }
  return out.filter(([a, b]) => b - a > EPS);
}
