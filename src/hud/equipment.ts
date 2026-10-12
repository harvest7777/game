import type { ItemKind, ItemId } from "../ecs/inventory/items";
import { itemDef } from "../ecs/inventory/items";
import type { Entity, World } from "../ecs/world";
import { HUD_COLORS, type HudElement, type PanelLayout } from "./elements";

// What the HUD needs to show about one item.
export type ItemView = { id: ItemId; name: string; sprite: string };

// What's worn in each slot, as the equipment panel shows it.
export type EquipmentView = Record<ItemKind, ItemView | null>;

// Reads what an entity is wearing, or undefined if it has no equipment.
export function equipmentView(
  world: World,
  entity: Entity,
): EquipmentView | undefined {
  const equipment = world.components.equipment.get(entity);
  if (!equipment) return undefined;
  const view = (item: { def: ItemId } | null): ItemView | null => {
    if (!item) return null;
    const def = itemDef(item.def);
    return { id: item.def, name: def.name, sprite: def.sprite };
  };
  return {
    weapon: view(equipment.weapon),
    ability: view(equipment.ability),
    armor: view(equipment.armor),
    ring: view(equipment.ring),
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

// In UI pixels: an 8x8 icon inside a 1-pixel slot border, slots 2 apart,
// inside a 2-pixel margin.
const SLOT = 10;
const GAP = 2;
const MARGIN = 2;

// The four equipment slots in a row: weapon, ability, armor, ring. Each
// shows its item's icon, or a dim letter for its kind when empty.
export function equipmentPanel(view: EquipmentView): PanelLayout {
  const w =
    MARGIN * 2 + SLOT * SLOT_ORDER.length + GAP * (SLOT_ORDER.length - 1);
  const h = MARGIN * 2 + SLOT;
  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w, h },
      fill: HUD_COLORS.panel,
      border: HUD_COLORS.panelBorder,
    },
  ];

  SLOT_ORDER.forEach((kind, i) => {
    const rect = { x: MARGIN + i * (SLOT + GAP), y: MARGIN, w: SLOT, h: SLOT };
    elements.push(
      {
        kind: "box",
        rect,
        fill: HUD_COLORS.slot,
        border: HUD_COLORS.slotBorder,
      },
      { kind: "slot", rect, ref: { in: "equipment", slot: kind } },
    );
    const item = view[kind];
    if (item) {
      elements.push({
        kind: "icon",
        rect: { x: rect.x + 1, y: rect.y + 1, w: 8, h: 8 },
        sprite: item.sprite,
      });
    } else {
      elements.push({
        kind: "text",
        x: rect.x + SLOT / 2,
        y: rect.y + 1,
        text: SLOT_LABELS[kind],
        font: "regular",
        tint: HUD_COLORS.dimLabel,
        align: "center",
      });
    }
  });

  return { w, h, elements };
}
