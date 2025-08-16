export function toNearest(arr: number[], target: number): number {
  let best = arr[0];
  let d = Math.abs(arr[0] - target);
  for (const x of arr) { const nd = Math.abs(x - target); if (nd < d) { d = nd; best = x; } }
  return best;
}
