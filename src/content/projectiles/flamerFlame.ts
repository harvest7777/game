import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { FIREBALL_ART, HIT_SOUND, SMALL } from "./shared";

// A flamer's short breath of fire.
export const flamerFlame: ProjectileDef = {
  speed: 7,
  damage: [25, 32],
  lifetime: 0.4,
  hitbox: SMALL,
  sprite: { art: FIREBALL_ART, scale: 0.6, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
};
