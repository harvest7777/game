import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { FIREBALL_ART, HIT_SOUND } from "./shared";

// Malphas's ring flame, slow and wide.
export const malphasFlame: ProjectileDef = {
  speed: 6,
  damage: [40, 52],
  lifetime: 2,
  hitbox: { r: 0.3 },
  sprite: { art: FIREBALL_ART, scale: 1.1, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
};
