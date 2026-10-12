import type { Entity, World } from "../world";
import { emptyEquipment, INVENTORY_SIZE } from "./components";
import type { EquipmentItemDef, ItemDef, ItemKind } from "./items";
import { armWithEquippedWeapon } from "../shared/arming";

type HoldingsOptions = {
  // What to wear from the start; omitted slots stay empty.
  equipment?: Partial<Record<ItemKind, EquipmentItemDef>>;
  // Fills the inventory from the first slot; the rest stay empty.
  carrying?: ItemDef[];
};

// Gives an entity equipment and an inventory, and arms it with its weapon.
export function addHoldings(
  world: World,
  entity: Entity,
  { equipment: starting = {}, carrying = [] }: HoldingsOptions,
): void {
  const equipment = emptyEquipment();
  for (const [kind, def] of Object.entries(starting) as [
    ItemKind,
    EquipmentItemDef,
  ][]) {
    if (def.kind !== kind) {
      throw new Error(`${def.name} cannot start in the ${kind} slot`);
    }
    equipment[kind] = { def };
  }
  const slots = Array.from({ length: INVENTORY_SIZE }, (_, i) =>
    carrying[i] ? { def: carrying[i] } : null,
  );
  world.components.equipment.set(entity, equipment);
  world.components.inventory.set(entity, { slots });
  armWithEquippedWeapon(world, entity);
}
