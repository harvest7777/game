import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { FIREBALL_ART, HIT_SOUND } from "./shared";

// A brute's close-range blast.
export const bruteShot: ProjectileDef = {
  speed: 9,
  damage: [35, 45],
  lifetime: 0.45,
  hitbox: { r: 0.2 },
  sprite: {
    art: FIREBALL_ART,
    scale: 0.7,
    outline: BLACK_OUTLINE,
  },
  sound: HIT_SOUND,
};
