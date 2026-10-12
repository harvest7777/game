import type { Entity, World } from "../world";
import { INVENTORY_SIZE, type Equipment } from "./components";
import type { ItemId } from "./items";
import { armWithEquippedWeapon } from "./system";

type HoldingsOptions = {
  // The weapon to wear, if any. Other equipment slots start empty.
  weapon?: ItemId;
  // Fills the inventory from the first slot; the rest stay empty.
  carrying?: ItemId[];
};

// Gives an entity equipment and an inventory, and arms it with its weapon.
export function addHoldings(
  world: World,
  entity: Entity,
  { weapon, carrying = [] }: HoldingsOptions,
): void {
  const equipment: Equipment = {
    weapon: weapon ? { def: weapon } : null,
    ability: null,
    armor: null,
    ring: null,
  };
  const slots = Array.from({ length: INVENTORY_SIZE }, (_, i) =>
    carrying[i] ? { def: carrying[i] } : null,
  );
  world.components.equipment.set(entity, equipment);
  world.components.inventory.set(entity, { slots });
  armWithEquippedWeapon(world, entity);
}
