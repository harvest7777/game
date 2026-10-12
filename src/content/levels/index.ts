import type { LevelDef } from "../../ecs/level/definitions";
import { nexus } from "./nexus";

// Every level, by id.
export const levels = {
  nexus,
} satisfies Record<string, LevelDef>;

export type LevelId = keyof typeof levels;

export const levelIds = Object.keys(levels) as LevelId[];
