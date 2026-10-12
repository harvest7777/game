// Seeded randomness for dungeon generation, so the same seed always builds
// the same dungeon. Every stage takes an `Rng` instead of calling
// Math.random, and tests pick seeds.

// A random number in [0, 1).
export type Rng = () => number;

// Inclusive [min, max].
export type Range = [number, number];

// mulberry32: tiny, fast and plenty random for level layouts.
export function seeded(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A new seed for the `n`th retry of `seed`, unrelated to its neighbors, so
// retry 1 of seed 5 doesn't build retry 0 of seed 6.
export function deriveSeed(seed: number, n: number): number {
  let h = (seed ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// A whole number in [min, max].
export function int(rng: Rng, [min, max]: Range): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// A number in [min, max).
export function float(rng: Rng, [min, max]: Range): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick from an empty list");
  return items[Math.floor(rng() * items.length)];
}

// One item, each as likely as its `weight` is of the total.
export function weighted<T extends { weight: number }>(
  rng: Rng,
  items: readonly T[],
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) throw new Error("weighted pick needs a positive weight");
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

// A shuffled copy (Fisher-Yates).
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
