import { addSprite } from "../bundles";
import type { Vec2 } from "../shared/physics/math";
import { isWall } from "../tiles";
import { spawn, type Entity, type World } from "../world";
import { bundleLoot } from "./runtime";
import type { ItemDef } from "../inventory/items";

export const LOOT_BAG_OPEN_RADIUS = 0.75;

export function spawnLootBags(
  world: World,
  items: readonly ItemDef[],
  at: Vec2,
): Entity[] {
  const bundles = bundleLoot(world.loot, items);
  // One random turn for the whole drop, so several bags still fan out evenly.
  const turn = world.random() * Math.PI * 2;
  return bundles.map(({ bag, items }, index) => {
    const entity = spawn(world);
    world.components.position.set(
      entity,
      bagSpot(world, at, index, bundles.length, turn),
    );
    addSprite(world, entity, {
      art: bag.art,
      layer: "ground",
      outline: structuredClone(bag.outline),
    });
    world.components.container.set(entity, {
      slots: Array.from({ length: bag.capacity }, (_, slot) =>
        items[slot] ? { def: items[slot] } : null,
      ),
    });
    world.components.proximityContainer.set(entity, {
      radius: LOOT_BAG_OPEN_RADIUS,
    });
    world.components.lootBag.set(entity, {
      def: bag,
      previousAge: 0,
      age: 0,
    });
    return entity;
  });
}

// How far from where its enemy died a bag lands, in tiles: never right on
// top of it, so a bag doesn't hide what's under the enemy, like a portal.
export const BAG_DROP_DISTANCE: [min: number, max: number] = [0.5, 1];

// Where the `index`th of `count` bags lands: a random distance out, the
// bags spread evenly around starting from `turn`. A spot in a wall moves
// to the next direction round; if every one is walled, the bag lands where
// the enemy died.
function bagSpot(
  world: World,
  at: Vec2,
  index: number,
  count: number,
  turn: number,
): Vec2 {
  const [min, max] = BAG_DROP_DISTANCE;
  const distance = min + world.random() * (max - min);
  const tries = 8;
  for (let i = 0; i < tries; i++) {
    const angle = turn + ((index + i / tries) / count) * Math.PI * 2;
    const spot = {
      x: at.x + Math.cos(angle) * distance,
      y: at.y + Math.sin(angle) * distance,
    };
    if (!isWall(world.tiles, Math.floor(spot.x), Math.floor(spot.y))) {
      return spot;
    }
  }
  return { x: at.x, y: at.y };
}
