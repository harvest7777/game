import type { Entity, World } from "../ecs/world";
import type { PanelLayout } from "./elements";
import { itemView, type ItemView } from "./items";
import { slotPanel } from "./layout";

// What's in each inventory slot, in order.
export type InventoryView = (ItemView | null)[];

export function inventoryView(
  world: World,
  entity: Entity,
): InventoryView | undefined {
  return world.components.inventory.get(entity)?.slots.map(itemView);
}

// The inventory's slots, four to a row, numbered by the keys that equip
// them.
export function inventoryPanel(view: InventoryView): PanelLayout {
  return slotPanel(
    "Inventory",
    view.map((item, index) => ({
      ref: { in: "inventory", index },
      item,
      emptyLabel: index < 8 ? String(index + 1) : undefined,
    })),
    4,
  );
}
