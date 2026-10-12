import { describe, expect, it } from "vitest";
import type { LevelDef } from "../../ecs/level/definitions";
import { levelTiles } from "../../ecs/level/load";
import { isWall } from "../../ecs/tiles";
import { enemies } from "../enemies";
import { levelIds, levels } from ".";

describe("level definitions", () => {
  for (const id of levelIds) {
    describe(id, () => {
      const level: LevelDef = levels[id];

      it("has a valid map", () => {
        expect(() => levelTiles(level)).not.toThrow();
      });

      it("places only listed enemies, on floor", () => {
        const { tiles } = levelTiles(level);
        for (const { enemy, at } of level.enemies ?? []) {
          expect(Object.values(enemies)).toContain(enemy);
          expect(isWall(tiles, Math.floor(at.x), Math.floor(at.y))).toBe(false);
        }
      });
    });
  }
});
