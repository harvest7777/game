import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, STAR_ART } from "./shared";

export const boomerang: ProjectileDef = {
  speed: 10,
  damage: [20, 30],
  lifetime: 1.2,
  hitbox: { r: 0.25 },
  sprite: { art: STAR_ART },
  sound: HIT_SOUND,
  boomerang: true,
  spin: 4 * Math.PI,
};
