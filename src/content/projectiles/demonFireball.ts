import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { ENEMY_SHOT, FIREBALL_ART, HIT_SOUND } from "./shared";

// A demon's heavy fireball.
export const demonFireball: ProjectileDef = {
  speed: 7,
  damage: [35, 45],
  lifetime: 1.2,
  hitbox: { r: 0.25 },
  sprite: { art: FIREBALL_ART, scale: 0.9, outline: ENEMY_SHOT },
  sound: HIT_SOUND,
};
