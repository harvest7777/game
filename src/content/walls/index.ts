import type { WallDef } from "../../ecs/tiles";
import { abyssBrickWall } from "./abyssBrick";

// Every kind of wall besides the default, by id.
export const walls = {
  abyssBrick: abyssBrickWall,
} satisfies Record<string, WallDef>;

export type WallId = keyof typeof walls;

export const wallIds = Object.keys(walls) as WallId[];
