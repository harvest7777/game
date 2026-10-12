import { addSprite } from "../bundles";
import type { Vec2 } from "../shared/physics/math";
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
  return bundles.map(({ bag, items }, index) => {
    const entity = spawn(world);
    const offset = bagOffset(index, bundles.length);
    world.components.position.set(entity, {
      x: at.x + offset.x,
      y: at.y + offset.y,
    });
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

function bagOffset(index: number, count: number): Vec2 {
  if (count <= 1) return { x: 0, y: 0 };
  const angle = (index / count) * Math.PI * 2;
  return { x: Math.cos(angle) * 0.45, y: Math.sin(angle) * 0.45 };
}
