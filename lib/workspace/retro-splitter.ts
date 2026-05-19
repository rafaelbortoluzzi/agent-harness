export interface SplitterArgs {
  base: number
  delta: number
  min: number
  max: number
}

export function computeSplitterWidth({ base, delta, min, max }: SplitterArgs): number {
  return Math.max(min, Math.min(max, Math.floor(base + delta)))
}
