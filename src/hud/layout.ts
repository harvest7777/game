import type { SlotRef } from "../ecs/inventory/components";
import { HUD_COLORS, type HudElement, type PanelLayout } from "./elements";
import type { ItemView } from "./items";

// In UI pixels: an 8x8 icon inside a 1-pixel slot border, slots 2 apart,
// inside a 2-pixel margin, under a title bar.
export const SLOT = 10;
export const GAP = 2;
export const MARGIN = 2;
export const TITLE = 10;

export type SlotContent = {
  ref: SlotRef;
  item: ItemView | null;
  // Shown dimly when the slot is empty.
  emptyLabel?: string;
};

// A titled panel with item slots in a grid, `columns` wide. The title bar is
// where the panel is grabbed to move it.
export function slotPanel(
  title: string,
  slots: SlotContent[],
  columns: number,
): PanelLayout {
  const rows = Math.ceil(slots.length / columns);
  const w = MARGIN * 2 + SLOT * columns + GAP * (columns - 1);
  const h = TITLE + MARGIN + SLOT * rows + GAP * (rows - 1);
  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w, h },
      fill: HUD_COLORS.panel,
      border: HUD_COLORS.panelBorder,
    },
    {
      kind: "text",
      x: w / 2,
      y: 2,
      text: title,
      font: "regular",
      tint: HUD_COLORS.title,
      align: "center",
    },
    { kind: "handle", rect: { x: 0, y: 0, w, h: TITLE } },
  ];

  slots.forEach(({ ref, item, emptyLabel }, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const rect = {
      x: MARGIN + column * (SLOT + GAP),
      y: TITLE + row * (SLOT + GAP),
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
        rect: { x: rect.x + 1, y: rect.y + 1, w: 8, h: 8 },
        sprite: item.sprite,
        ref,
      });
    } else if (emptyLabel) {
      elements.push({
        kind: "text",
        x: rect.x + SLOT / 2,
        y: rect.y + 1,
        text: emptyLabel,
        font: "regular",
        tint: HUD_COLORS.dimLabel,
        align: "center",
      });
    }
  });

  return { w, h, elements };
}
