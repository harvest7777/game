import { parseDungeonDef, type DungeonDef } from "../../dungeon/definition";
import type { DungeonRegistries } from "../../ecs/level/dungeon";
import { enemies, enemyIds } from "../enemies";
import { groundIds, grounds } from "../grounds";
import { wallIds, walls } from "../walls";
import abyssJson from "./abyss.json";
import testCavesJson from "./testCaves.json";

// What dungeon files can name by id.
export const dungeonRegistries: DungeonRegistries = { enemies, grounds, walls };

const known = { enemies: enemyIds, grounds: groundIds, walls: wallIds };

// Every dungeon file, by id.
const files = {
  abyss: abyssJson as unknown,
  testCaves: testCavesJson as unknown,
};

export type DungeonId = keyof typeof files;

// Every dungeon file that checks out, by id, and what's wrong with any that
// don't. A broken file is left out and reported rather than thrown, so one
// bad dungeon can't stop the game from starting; content tests fail on it.
export const dungeons: Partial<Record<DungeonId, DungeonDef>> = {};
export const dungeonErrors: Partial<Record<DungeonId, string[]>> = {};
for (const [id, file] of Object.entries(files) as [DungeonId, unknown][]) {
  const result = parseDungeonDef(file, known);
  if (result.ok) {
    dungeons[id] = result.def;
  } else {
    dungeonErrors[id] = result.errors;
    console.error(`dungeon "${id}" left out:\n  ${result.errors.join("\n  ")}`);
  }
}

// The ids of the dungeons that checked out.
export const dungeonIds = Object.keys(dungeons) as DungeonId[];
