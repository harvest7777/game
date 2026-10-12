import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { FIREBALL_ART, HIT_SOUND, SMALL } from "./shared";

// An imp's quick little fireball.
export const impFire: ProjectileDef = {
  speed: 9,
  damage: [20, 26],
  lifetime: 0.8,
  hitbox: SMALL,
  sprite: { art: FIREBALL_ART, scale: 0.6, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
};
