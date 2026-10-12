import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

export const wavy: ProjectileDef = {
  speed: 8,
  damage: [15, 25],
  lifetime: 1,
  hitbox: { r: 0.2 },
  sprite: { art: ORB_ART, outline: BLACK_OUTLINE },
  sound: HIT_SOUND,
  wave: { amplitude: 0.5, frequency: 2 },
};
