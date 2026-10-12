import { describe, expect, it } from "vitest";
import { generateHere } from "../../dungeon/generator";
import { destination } from "../destinations";
import { enemies } from "../enemies";
import { levels } from "../levels";
import { portals } from ".";

describe("portal definitions", () => {
  for (const [id, portal] of Object.entries(portals)) {
    it(`${id} leads somewhere`, async () => {
      expect(await destination(portal.to)).toBeDefined();
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
  it("is undefined for somewhere that doesn't exist", async () => {
    expect(await destination("nowhere")).toBeUndefined();
  });

  it("builds a fresh dungeon from the random seed", async () => {
    const level = (await destination("testCaves", generateHere, () => 0.5))!;
    expect(level.name).toBe(`Test Caves (seed ${2 ** 30})`);
  });

  it("rejects when the dungeon can't be built", async () => {
    const failing = () => Promise.reject(new Error("no room"));
    await expect(destination("testCaves", failing)).rejects.toThrow("no room");
  });
});
