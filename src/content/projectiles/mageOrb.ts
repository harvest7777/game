import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// A demon mage's orb: drifts out slowly, then speeds up.
export const mageOrb: ProjectileDef = {
  speed: 2,
  damage: [30, 40],
  lifetime: 2,
  hitbox: { r: 0.25 },
  sprite: { art: ORB_ART, scale: 1.1, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  acceleration: 6,
  maxSpeed: 8,
};
