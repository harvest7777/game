import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, STAR_ART } from "./shared";

// A bloom's inner petal: leans out to the left, then curls gently back up,
// meeting the outer petal at the top. Mirror it for the right.
export const bud: ProjectileDef = {
  speed: 8,
  damage: [16, 24],
  lifetime: 0.48,
  hitbox: { r: 0.2 },
  sprite: { art: STAR_ART, outline: { color: [1, 0.84, 0.92, 1] } },
  sound: HIT_SOUND,
  turnRate: 1.8,
  turnAcceleration: -1.5,
  spin: 3 * Math.PI,
};
