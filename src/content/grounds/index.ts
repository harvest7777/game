import type { GroundDef } from "../../ecs/tiles";
import { grass } from "./grass";
import { water } from "./water";
import { wood } from "./wood";

// Every kind of ground, by id.
export const grounds = {
  grass,
  wood,
  water,
} satisfies Record<string, GroundDef>;

export type GroundId = keyof typeof grounds;

export const groundIds = Object.keys(grounds) as GroundId[];
