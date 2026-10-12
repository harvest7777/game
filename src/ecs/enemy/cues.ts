import { fireWeapon } from "../shared/firing";
import type { Vec2 } from "../shared/physics/math";
import type { Entity, World } from "../world";
import type { BossCue } from "./sequences";

// Who a cue plays for and where: the boss, its position, and which way it
// aims (worked out only if a cue needs it).
export type CueSource = {
  entity: Entity;
  at: Vec2;
  aim: () => Vec2;
};

type HandlerFor<C extends BossCue> = (
  world: World,
  cue: C,
  source: CueSource,
) => void;

// What each kind of cue does when its moment comes. Adding a kind is adding
// an entry here.
const CUE_HANDLERS: {
  [K in BossCue["kind"]]: HandlerFor<Extract<BossCue, { kind: K }>>;
} = {
  fire: (world, { weapon, offset }, { entity, at, aim }) =>
    fireWeapon(world, { entity, weapon, at, aim: aim(), offset }),
  sound: (world, { sound }, { at }) => {
    world.events.soundCues.push({ sound, at: { ...at } });
  },
};

export function playCue(world: World, cue: BossCue, source: CueSource): void {
  const handle = CUE_HANDLERS[cue.kind] as HandlerFor<BossCue>;
  handle(world, cue, source);
}
