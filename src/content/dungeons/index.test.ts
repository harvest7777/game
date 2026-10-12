import { describe, expect, it } from "vitest";
import { generateDungeon } from "../../dungeon/generate";
import { dungeonLevel } from "../../ecs/level/dungeon";
import { levelTiles } from "../../ecs/level/load";
import { dungeonErrors, dungeonIds, dungeonRegistries, dungeons } from ".";

const SEEDS = Array.from({ length: 50 }, (_, i) => i);

// The share of rooms allowed to leave a feature out.
const MAX_DROPPED_FEATURES = 0.1;

describe("dungeon definitions", () => {
  it("every dungeon file checks out", () => {
    expect(dungeonErrors).toEqual({});
  });

  for (const id of dungeonIds) {
    describe(id, () => {
      it("builds a valid level from every seed tried", () => {
        for (const seed of SEEDS) {
          const level = dungeonLevel(dungeons[id]!, seed, dungeonRegistries);
          expect(() => levelTiles(level)).not.toThrow();
        }
      });

      it("fits every enemy it rolls, and almost every feature", () => {
        let rooms = 0;
        let dropped = 0;
        for (const seed of SEEDS) {
          const { map, report } = generateDungeon(dungeons[id]!, seed);
          expect(report.unplacedSpawns, `seed ${seed}`).toEqual([]);
          rooms += map.rooms.length;
          dropped += report.droppedFeatures.length;
        }
        // A pool now and then can't fit a cramped cave; more means the
        // dungeon asks for features its rooms can't hold.
        expect(dropped / rooms).toBeLessThan(MAX_DROPPED_FEATURES);
      });

      it("has enemies to fight", () => {
        const level = dungeonLevel(dungeons[id]!, 1, dungeonRegistries);
        expect(level.enemies?.length).toBeGreaterThan(0);
      });
    });
  }
});
