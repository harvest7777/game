import type { Entity, World } from "../world";
import { emptyEquipment, INVENTORY_SIZE } from "./components";
import type { EquipmentItemDef, ItemDef } from "./items";
import { armWithEquippedWeapon } from "../shared/arming";

type HoldingsOptions = {
  // The weapon to wear, if any. Other equipment slots start empty.
  weapon?: EquipmentItemDef;
  // Fills the inventory from the first slot; the rest stay empty.
  carrying?: ItemDef[];
};

// Gives an entity equipment and an inventory, and arms it with its weapon.
export function addHoldings(
  world: World,
  entity: Entity,
  { weapon, carrying = [] }: HoldingsOptions,
): void {
  const equipment = emptyEquipment();
  if (weapon) equipment.weapon = { def: weapon };
  const slots = Array.from({ length: INVENTORY_SIZE }, (_, i) =>
    carrying[i] ? { def: carrying[i] } : null,
  );
  world.components.equipment.set(entity, equipment);
  world.components.inventory.set(entity, { slots });
  armWithEquippedWeapon(world, entity);
}
