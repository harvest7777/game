import { fireWeapon } from "../shared/firing";
import type { Vec2 } from "../shared/physics/math";
import { isWall } from "../tiles";
import type { Entity, World } from "../world";
import { spawnEnemy } from "./spawn";
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
  summon: (world, { enemy, count, radius, max = Infinity }, { entity, at }) => {
    let alive = 0;
    for (const [, other] of world.components.enemy) {
      if (other.summoner === entity && other.def === enemy) alive++;
    }
    const calling = Math.min(count, max - alive);
    // Turned a random amount, so summons don't always land in the same spots.
    const turn = world.random() * 2 * Math.PI;
    for (let i = 0; i < calling; i++) {
      const angle = turn + (i / calling) * 2 * Math.PI;
      const spot = {
        x: at.x + Math.cos(angle) * radius,
        y: at.y + Math.sin(angle) * radius,
      };
      // Into a wall, it appears on the boss instead.
      const clear = !isWall(
        world.tiles,
        Math.floor(spot.x),
        Math.floor(spot.y),
      );
      const minion = spawnEnemy(world, enemy, clear ? spot : { ...at });
      world.components.enemy.get(minion)!.summoner = entity;
    }
  },
};

export function playCue(world: World, cue: BossCue, source: CueSource): void {
  const handle = CUE_HANDLERS[cue.kind] as HandlerFor<BossCue>;
  handle(world, cue, source);
}
