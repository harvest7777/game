import type { CreatureArt } from "../../ecs/sprite/art";
import { BLACK_OUTLINE } from "../../ecs/sprite/components";

// Enemies wear the same plain black outline as everything else.
export const OUTLINED = BLACK_OUTLINE;

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
