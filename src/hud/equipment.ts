import type { ItemKind } from "../ecs/inventory/items";
import type { Entity, World } from "../ecs/world";
import type { PanelLayout } from "./elements";
import { itemView, type ItemView } from "./items";
import { slotPanel } from "./layout";

export type { ItemView };

// What's worn in each slot, as the equipment panel shows it.
export type EquipmentView = Record<ItemKind, ItemView | null>;

// Reads what an entity is wearing, or undefined if it has no equipment.
export function equipmentView(
  world: World,
  entity: Entity,
): EquipmentView | undefined {
  const equipment = world.components.equipment.get(entity);
  if (!equipment) return undefined;
  return {
    weapon: itemView(equipment.weapon),
    ability: itemView(equipment.ability),
    armor: itemView(equipment.armor),
    ring: itemView(equipment.ring),
  };
}

// Left to right in the panel.
export const SLOT_ORDER: ItemKind[] = ["weapon", "ability", "armor", "ring"];
// Shown dimly in an empty slot.
export const SLOT_LABELS: Record<ItemKind, string> = {
  weapon: "W",
  ability: "S",
  armor: "A",
  ring: "R",
};

// The four equipment slots in a row: weapon, ability, armor, ring. Each
// shows its item's icon, or a dim letter for its kind when empty.
export function equipmentPanel(view: EquipmentView): PanelLayout {
  return slotPanel(
    "Equipment",
    SLOT_ORDER.map((kind) => ({
      ref: { in: "equipment", slot: kind },
      item: view[kind],
      emptyLabel: SLOT_LABELS[kind],
    })),
    SLOT_ORDER.length,
  );
}
