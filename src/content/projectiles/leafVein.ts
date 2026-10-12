import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

// The leaf's straight middle: farther and harder hitting than its edges.
export const leafVein: ProjectileDef = {
  speed: 10,
  damage: [30, 40],
  lifetime: 0.9,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  faceDirection: true,
};
