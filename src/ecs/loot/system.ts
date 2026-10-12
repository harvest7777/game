import type { World } from "../world";
import { rollLoot } from "./runtime";
import { spawnLootBags } from "./spawn";

// Rolls an enemy's table at its death position while all of its components
// still exist. Combat only reports the death; it never knows about loot.
export function lootSystem(world: World, _dt: number): void {
  for (const { entity } of world.events.deaths) {
    const enemy = world.components.enemy.get(entity);
    const at = world.components.position.get(entity);
    if (!enemy?.def.loot || !at) continue;
    const items = rollLoot(world.loot, enemy.def.loot, world.random);
    if (items.length > 0) spawnLootBags(world, items, at);
  }
}

// Ages existing bags and queues expired ones for normal end-of-tick cleanup.
export function lootBagSystem(world: World, dt: number): void {
  for (const [entity, bag] of world.components.lootBag) {
    bag.previousAge = bag.age;
    bag.age += dt;
    const empty = world.components.container
      .get(entity)
      ?.slots.every((item) => item === null);
    if (empty || bag.age >= bag.def.lifetime) {
      world.events.despawns.push(entity);
    }
  }
}
