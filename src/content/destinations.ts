import { generateHere, type DungeonGenerator } from "../dungeon/generator";
import type { LevelDef } from "../ecs/level/definitions";
import { levelFromDungeon } from "../ecs/level/dungeon";
import { dungeonRegistries, dungeons, type DungeonId } from "./dungeons";
import { levels, type LevelId } from "./levels";

// The level a portal's `to` leads to: a fixed level by id, or a fresh
// dungeon from a random seed, built by `generate`. Undefined for anywhere
// that doesn't exist; rejects if the dungeon can't be built.
export async function destination(
  to: string,
  generate: DungeonGenerator = generateHere,
  random: () => number = Math.random,
): Promise<LevelDef | undefined> {
  if (to in levels) return levels[to as LevelId];
  const def = dungeons[to as DungeonId];
  if (!def) return undefined;
  const seed = Math.floor(random() * 2 ** 31);
  return levelFromDungeon(def, await generate(def, seed), dungeonRegistries);
}
