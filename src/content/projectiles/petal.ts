import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, STAR_ART } from "./shared";

// A bloom's outer petal: leaves almost sideways to the left and hooks hard
// back up, its turn easing as it closes. Mirror it for the right.
export const petal: ProjectileDef = {
  speed: 8,
  damage: [16, 24],
  lifetime: 0.6,
  hitbox: { r: 0.2 },
  sprite: { art: STAR_ART, outline: { color: [0.94, 0.43, 0.67, 1] } },
  sound: HIT_SOUND,
  turnRate: 5,
  turnAcceleration: -4,
  spin: 3 * Math.PI,
};
