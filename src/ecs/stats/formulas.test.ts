import { describe, expect, it } from "vitest";
import {
  attackMultiplier,
  damageAfterDefense,
  fireRateMultiplier,
  healthPerSecond,
  manaPerSecond,
  tilesPerSecond,
} from "./formulas";

describe("stat formulas", () => {
  it("preserves current Wizard behavior at 25 Attack, Dexterity and Speed", () => {
    expect(attackMultiplier(25)).toBe(1);
    expect(fireRateMultiplier(25)).toBe(1);
    expect(tilesPerSecond(25)).toBe(5);
  });

  it("scales the planned caps", () => {
    expect(attackMultiplier(75)).toBe(2);
    expect(fireRateMultiplier(75)).toBe(1.5);
    expect(tilesPerSecond(75)).toBe(7);
  });

  it("leaves entities without offensive stats neutral", () => {
    expect(attackMultiplier(undefined)).toBe(1);
    expect(fireRateMultiplier(undefined)).toBe(1);
  });

  it("reduces damage point-for-point with a fifteen-percent floor", () => {
    expect(damageAfterDefense(100, 20)).toBe(80);
    expect(damageAfterDefense(100, 99)).toBe(15);
  });

  it("derives resource regeneration from Vitality and Wisdom", () => {
    expect(healthPerSecond(10)).toBe(1);
    expect(manaPerSecond(25)).toBe(2.5);
  });
});
