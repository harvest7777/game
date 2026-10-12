import { dungeonDef, type DungeonDef } from "../../dungeon/definition";
import type { DungeonRegistries } from "../../ecs/level/dungeon";
import { enemies, enemyIds } from "../enemies";
import { groundIds, grounds } from "../grounds";
import testCavesJson from "./testCaves.json";

// What dungeon files can name by id.
export const dungeonRegistries: DungeonRegistries = { enemies, grounds };

const known = { enemies: enemyIds, grounds: groundIds };

// Every dungeon, by id. Each is a JSON file, checked as it loads.
export const dungeons = {
  testCaves: dungeonDef(testCavesJson, known),
} satisfies Record<string, DungeonDef>;

export type DungeonId = keyof typeof dungeons;

export const dungeonIds = Object.keys(dungeons) as DungeonId[];
