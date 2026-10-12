import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { FIREBALL_ART, HIT_SOUND } from "./shared";

// The Demonfire Staff's fireball, weaving and burning through
// whatever it hits.
export const demonfire: ProjectileDef = {
  speed: 10,
  damage: [34, 46],
  lifetime: 0.85,
  hitbox: { r: 0.2 },
  sprite: { art: FIREBALL_ART, scale: 0.8 },
  sound: HIT_SOUND,
  wave: { amplitude: 0.35, frequency: 2 },
  pierces: true,
};
