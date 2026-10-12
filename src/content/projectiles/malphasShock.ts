import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// The shockwave of Malphas's slam: bursts out fast, then slows.
export const malphasShock: ProjectileDef = {
  speed: 11,
  damage: [55, 70],
  lifetime: 0.9,
  hitbox: { r: 0.3 },
  sprite: { art: ORB_ART, scale: 1.2, outline: { color: [1, 1, 1, 1] } },
  sound: HIT_SOUND,
  acceleration: -10,
  minSpeed: 3,
};
