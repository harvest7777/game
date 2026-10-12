import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

export const arrow: ProjectileDef = {
  speed: 10,
  damage: [25, 35],
  lifetime: 1,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  faceDirection: true,
};
