import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// Flies through walls, glowing so it's easy to follow behind them.
export const ghost: ProjectileDef = {
  speed: 9,
  damage: [10, 20],
  lifetime: 1,
  hitbox: { r: 0.2 },
  sprite: {
    art: ORB_ART,
    outline: {
      color: [0.6, 0.9, 1, 1],
      glow: { radius: 1.5, pulseHz: 3 },
    },
  },
  sound: HIT_SOUND,
  walls: "pass",
};
