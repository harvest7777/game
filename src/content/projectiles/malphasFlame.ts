import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { ENEMY_SHOT, FIREBALL_ART, HIT_SOUND } from "./shared";

// Malphas's ring flame, slow and wide.
export const malphasFlame: ProjectileDef = {
  speed: 6,
  damage: [50, 65],
  lifetime: 2,
  hitbox: { r: 0.3 },
  sprite: { art: FIREBALL_ART, scale: 1.1, outline: ENEMY_SHOT },
  sound: HIT_SOUND,
};
