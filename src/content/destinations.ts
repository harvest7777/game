import type { LevelDef } from "../ecs/level/definitions";
import { dungeonLevel } from "../ecs/level/dungeon";
import { dungeonRegistries, dungeons, type DungeonId } from "./dungeons";
import { levels, type LevelId } from "./levels";

// The level a portal's `to` leads to: a fixed level by id, or a fresh
// dungeon from a random seed. Undefined for anywhere that doesn't exist.
export function destination(
  to: string,
  random: () => number = Math.random,
): LevelDef | undefined {
  if (to in levels) return levels[to as LevelId];
  if (to in dungeons) {
    const seed = Math.floor(random() * 2 ** 31);
    return dungeonLevel(dungeons[to as DungeonId], seed, dungeonRegistries);
  }
  return undefined;
}
