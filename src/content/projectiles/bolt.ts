import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

export const bolt: ProjectileDef = {
  speed: 12,
  damage: [20, 30],
  lifetime: 0.6,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  faceDirection: true,
};
