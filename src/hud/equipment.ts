import { ITEM_KINDS, type ItemKind } from "../ecs/inventory/items";
import type { Entity, World } from "../ecs/world";
import type { PanelLayout } from "./elements";
import { itemView, KIND_LABELS, type ItemView } from "./items";
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
  return Object.fromEntries(
    ITEM_KINDS.map((kind) => [kind, itemView(equipment[kind])]),
  ) as EquipmentView;
}

// The equipment slots in a row, in ITEM_KINDS order. Each shows its item's
// icon, or a dim letter for its kind when empty.
export function equipmentPanel(view: EquipmentView): PanelLayout {
  return slotPanel(
    ITEM_KINDS.map((kind) => ({
      ref: { in: "equipment", slot: kind },
      item: view[kind],
      emptyLabel: KIND_LABELS[kind].letter,
    })),
    ITEM_KINDS.length,
  );
}
