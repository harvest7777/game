import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { HIT_SOUND, ORB_ART } from "./shared";

// Weaves in long, slow waves. Fired with a mirrored twin, the pair braid
// around each other.
export const helix: ProjectileDef = {
  speed: 9,
  damage: [18, 26],
  lifetime: 1.1,
  hitbox: { r: 0.18 },
  sprite: { art: ORB_ART, outline: { color: [0.86, 0.27, 0.43, 1] } },
  sound: HIT_SOUND,
  wave: { amplitude: 0.5, frequency: 1.5 },
};
