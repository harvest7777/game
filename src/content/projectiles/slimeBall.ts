import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// Enemy shots, outlined red so they're easy to tell from the player's.
export const slimeBall: ProjectileDef = {
  speed: 5,
  damage: [15, 20],
  lifetime: 1.6,
  hitbox: { r: 0.25 },
  sprite: {
    art: ORB_ART,
    scale: 1,
    outline: { color: [0.9, 0.15, 0.15, 1] },
  },
  sound: HIT_SOUND,
};
