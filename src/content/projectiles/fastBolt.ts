import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND } from "./shared";

// Covers far more than a tile per tick, to check it still stops at walls.
export const fastBolt: ProjectileDef = {
  speed: 40,
  damage: [10, 15],
  lifetime: 0.35,
  hitbox: { r: 0.12 },
  sprite: { art: BOLT_ART },
  sound: HIT_SOUND,
  faceDirection: true,
};
