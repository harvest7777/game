import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { ENEMY_SHOT, FIREBALL_ART, HIT_SOUND } from "./shared";

// Malphas's frenzy flame: curls hard at first, then straightens
// out, so mirrored pairs sweep across each other.
export const malphasCurl: ProjectileDef = {
  speed: 7,
  damage: [35, 45],
  lifetime: 2.2,
  hitbox: { r: 0.25 },
  sprite: { art: FIREBALL_ART, outline: ENEMY_SHOT },
  sound: HIT_SOUND,
  turnRate: 2,
  turnAcceleration: -1.2,
};
