import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

// Quick and short.
export const needle: ProjectileDef = {
  speed: 16,
  damage: [22, 30],
  lifetime: 0.55,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, scale: 0.7, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  faceDirection: true,
};
