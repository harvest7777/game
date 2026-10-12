import { BLACK_OUTLINE } from "../../ecs/sprite/components";
import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, PREJUDICE_ART } from "./shared";

// Extreme Prejudice's shard: speeds up while curving, weaving and
// spinning, so a full ring of them swirls outward.
export const prejudice: ProjectileDef = {
  speed: 6,
  damage: [25, 40],
  lifetime: 1.4,
  hitbox: { r: 0.2 },
  sprite: {
    art: PREJUDICE_ART,
    outline: BLACK_OUTLINE,
  },
  sound: HIT_SOUND,
  acceleration: 8,
  maxSpeed: 13,
  turnRate: 0.75 * Math.PI,
  wave: { amplitude: 0.4, frequency: 3 },
  spin: 6 * Math.PI,
};
