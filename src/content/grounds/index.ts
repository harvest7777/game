import type { GroundDef } from "../../ecs/tiles";
import { grass } from "./grass";
import { lava } from "./lava";
import { stone } from "./stone";
import { water } from "./water";
import { wood } from "./wood";

// Every kind of ground, by id.
export const grounds = {
  grass,
  wood,
  water,
  stone,
  lava,
} satisfies Record<string, GroundDef>;

export type GroundId = keyof typeof grounds;

export const groundIds = Object.keys(grounds) as GroundId[];
