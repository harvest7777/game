import { describe, expect, it } from "vitest";
import { deriveSeed, int, pick, seeded, shuffled, weighted } from "./rng";

const draws = (seed: number, count: number) => {
  const rng = seeded(seed);
  return Array.from({ length: count }, rng);
};

describe("seeded", () => {
  it("when given the same seed, repeats the same numbers", () => {
    expect(draws(42, 10)).toEqual(draws(42, 10));
  });

  it("when given different seeds, gives different numbers", () => {
    expect(draws(1, 10)).not.toEqual(draws(2, 10));
  });

  it("stays within [0, 1)", () => {
    for (const n of draws(7, 10_000)) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe("deriveSeed", () => {
  it("gives each retry its own seed", () => {
    const seeds = new Set([0, 1, 2, 3].map((n) => deriveSeed(5, n)));
    expect(seeds.size).toBe(4);
  });

  it("doesn't line up retries of neighboring seeds", () => {
    expect(deriveSeed(5, 1)).not.toBe(deriveSeed(6, 0));
  });
});

describe("int", () => {
  it("covers both ends of the range and nothing outside it", () => {
    const rng = seeded(3);
    const seen = new Set(Array.from({ length: 1000 }, () => int(rng, [2, 4])));
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });

  it("when the range is one number, always gives it", () => {
    expect(int(seeded(9), [6, 6])).toBe(6);
  });
});

describe("pick", () => {
  it("throws on an empty list", () => {
    expect(() => pick(seeded(1), [])).toThrow();
  });
});

describe("weighted", () => {
  it("never picks something weighted 0", () => {
    const rng = seeded(11);
    const items = [
      { name: "never", weight: 0 },
      { name: "always", weight: 1 },
    ];
    for (let i = 0; i < 1000; i++) {
      expect(weighted(rng, items).name).toBe("always");
    }
  });

  it("picks roughly in proportion to weight", () => {
    const rng = seeded(12);
    const items = [
      { name: "rare", weight: 1 },
      { name: "common", weight: 3 },
    ];
    const rolls = 10_000;
    let common = 0;
    for (let i = 0; i < rolls; i++) {
      if (weighted(rng, items).name === "common") common++;
    }
    // 3 of every 4, give or take a couple percent.
    expect(common / rolls).toBeCloseTo(0.75, 1);
  });
});

describe("shuffled", () => {
  it("keeps every item and leaves the original alone", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffled(seeded(4), items);
    expect([...result].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
