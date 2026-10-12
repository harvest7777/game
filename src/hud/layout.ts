import type { SlotRef } from "../ecs/inventory/components";
import { HUD_COLORS, type HudElement, type PanelLayout } from "./elements";
import type { ItemView } from "./items";

// In UI pixels: an 8x8 icon with a pixel of room on each side, inside a
// 1-pixel border, slots 2 apart.
export const SLOT = 12;
export const GAP = 2;
// How far in from the slot's corner the icon sits.
const INSET = 2;

export type SlotContent = {
  ref: SlotRef;
  item: ItemView | null;
  // Shown dimly when the slot is empty.
  emptyLabel?: string;
};

// Item slots in a grid, `columns` wide: just the squares, no panel behind
// them.
export function slotPanel(slots: SlotContent[], columns: number): PanelLayout {
  const rows = Math.ceil(slots.length / columns);
  const w = SLOT * columns + GAP * (columns - 1);
  const h = SLOT * rows + GAP * (rows - 1);
  const elements: HudElement[] = [];

  slots.forEach(({ ref, item, emptyLabel }, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const rect = {
      x: column * (SLOT + GAP),
      y: row * (SLOT + GAP),
      w: SLOT,
      h: SLOT,
    };
    elements.push(
      {
        kind: "box",
        rect,
        fill: HUD_COLORS.slot,
        border: HUD_COLORS.slotBorder,
        ref,
      },
      { kind: "slot", rect, ref },
    );
    if (item) {
      elements.push({
        kind: "icon",
        rect: { x: rect.x + INSET, y: rect.y + INSET, w: 8, h: 8 },
        sprite: item.sprite,
        ref,
      });
    } else if (emptyLabel) {
      elements.push({
        kind: "text",
        x: rect.x + SLOT / 2,
        y: rect.y + INSET,
        text: emptyLabel,
        font: "regular",
        tint: HUD_COLORS.dimLabel,
        align: "center",
      });
    }
  });

  return { w, h, elements };
}
