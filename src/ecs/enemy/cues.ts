import { fireWeapon } from "../shared/firing";
import type { Vec2 } from "../shared/physics/math";
import { clearLine } from "../tiles";
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
      const minion = spawnEnemy(
        world,
        enemy,
        summonSpot(world, at, angle, radius),
      );
      world.components.enemy.get(minion)!.summoner = entity;
    }
  },
};

// Where a summon `radius` tiles out at `angle` lands: there if the boss can
// see it, otherwise pulled in along the same line until it can, so a
// summon never appears through a wall in a corridor or the next room. On
// the boss itself if nowhere along the line is clear.
function summonSpot(world: World, at: Vec2, angle: number, radius: number) {
  for (const share of [1, 2 / 3, 1 / 3]) {
    const spot = {
      x: at.x + Math.cos(angle) * radius * share,
      y: at.y + Math.sin(angle) * radius * share,
    };
    if (clearLine(world.tiles, at, spot)) return spot;
  }
  return { x: at.x, y: at.y };
}

export function playCue(world: World, cue: BossCue, source: CueSource): void {
  const handle = CUE_HANDLERS[cue.kind] as HandlerFor<BossCue>;
  handle(world, cue, source);
}
