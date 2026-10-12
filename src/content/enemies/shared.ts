import type { CreatureArt } from "../../ecs/sprite/art";
import type { Outline } from "../../ecs/sprite/components";

// A plain black outline, so enemies stand out from the ground.
export const OUTLINED: Outline = { color: [0, 0, 0, 1] };

// A creature's frames, from its folder under public/sprites/enemies: two
// idle frames, then a wind-up and a release.
export function creatureArt(name: string): CreatureArt {
  const frame = (f: string) => `enemies/${name}/${f}`;
  return {
    kind: "creature",
    idle: [frame("idle-0"), frame("idle-1")],
    attack: [frame("attack-0"), frame("attack-1")],
  };
}
