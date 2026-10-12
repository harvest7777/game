import { describe, expect, it } from "vitest";
import { destination } from "../destinations";
import { enemies } from "../enemies";
import { levels } from "../levels";
import { portals } from ".";

describe("portal definitions", () => {
  for (const [id, portal] of Object.entries(portals)) {
    it(`${id} leads somewhere`, () => {
      expect(destination(portal.to, () => 0.5)).toBeDefined();
    });
  }

  it("levels and enemies only open listed portals", () => {
    const listed = Object.values(portals);
    for (const level of Object.values(levels)) {
      for (const { portal } of level.portals ?? []) {
        expect(listed).toContain(portal);
      }
    }
    for (const enemy of Object.values(enemies)) {
      if (enemy.deathPortal) expect(listed).toContain(enemy.deathPortal);
    }
  });
});

describe("destination", () => {
  it("is undefined for somewhere that doesn't exist", () => {
    expect(destination("nowhere")).toBeUndefined();
  });

  it("builds a fresh dungeon from the random seed", () => {
    const level = destination("testCaves", () => 0.5)!;
    expect(level.name).toBe(`Test Caves (seed ${2 ** 30})`);
  });
});
