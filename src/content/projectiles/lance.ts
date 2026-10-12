import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

// Goes through everything it hits.
export const lance: ProjectileDef = {
  speed: 14,
  damage: [30, 40],
  lifetime: 0.7,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, scale: 1.2, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  pierces: true,
  faceDirection: true,
};
