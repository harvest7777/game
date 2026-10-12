import { describe, expect, it } from "vitest";
import { dungeonLevel } from "../../ecs/level/dungeon";
import { levelTiles } from "../../ecs/level/load";
import { dungeonIds, dungeonRegistries, dungeons } from ".";

const SEEDS = Array.from({ length: 50 }, (_, i) => i);

describe("dungeon definitions", () => {
  for (const id of dungeonIds) {
    describe(id, () => {
      it("builds a valid level from every seed tried", () => {
        for (const seed of SEEDS) {
          const level = dungeonLevel(dungeons[id], seed, dungeonRegistries);
          expect(() => levelTiles(level)).not.toThrow();
        }
      });

      it("has enemies to fight", () => {
        const level = dungeonLevel(dungeons[id], 1, dungeonRegistries);
        expect(level.enemies?.length).toBeGreaterThan(0);
      });
    });
  }
});
