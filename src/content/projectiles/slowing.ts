import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// Slows to a crawl and lingers.
export const slowing: ProjectileDef = {
  speed: 14,
  damage: [30, 40],
  lifetime: 2,
  hitbox: { r: 0.2 },
  sprite: { art: ORB_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  acceleration: -20,
  minSpeed: 1,
};
