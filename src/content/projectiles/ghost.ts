import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// Flies through walls.
export const ghost: ProjectileDef = {
  speed: 9,
  damage: [10, 20],
  lifetime: 1,
  hitbox: { r: 0.2 },
  sprite: {
    art: ORB_ART,
    outline: BLACK_OUTLINE,
  },
  sound: HIT_SOUND,
  walls: "pass",
};
