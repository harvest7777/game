import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

export const spiral: ProjectileDef = {
  speed: 6,
  damage: [15, 20],
  lifetime: 2,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  turnRate: Math.PI,
  faceDirection: true,
};
