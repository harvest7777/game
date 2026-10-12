import type { SlotRef } from "../ecs/inventory/components";
import type { Color } from "../ecs/sprite/components";
import type { FontName } from "../render/assets";
import type { Rect } from "./state";

// What a panel is made of, in UI pixels relative to the panel's top-left.
// Panels only describe these; drawing and (later) clicking both work from
// the same list, so what you see is what you can click.
export type HudElement =
  // A filled box with a 1-pixel border.
  | { kind: "box"; rect: Rect; fill: Color; border: Color }
  // A sprite from the manifest, drawn 1 UI pixel per art pixel, outlined.
  | { kind: "icon"; rect: Rect; sprite: string }
  // Text with its glyph cells' top at `y`, centered on `x` if asked.
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      font: FontName;
      tint: Color;
      align?: "left" | "center";
    }
  // Where an item slot is, for clicking. Not drawn.
  | { kind: "slot"; rect: Rect; ref: SlotRef };

// A panel's contents: its size and what's in it.
export type PanelLayout = { w: number; h: number; elements: HudElement[] };

// The HUD's palette.
export const HUD_COLORS = {
  panel: [0.08, 0.08, 0.1, 0.92] as Color,
  panelBorder: [0.42, 0.38, 0.32, 1] as Color,
  slot: [0.16, 0.15, 0.18, 1] as Color,
  slotBorder: [0.3, 0.28, 0.3, 1] as Color,
  dimLabel: [0.38, 0.36, 0.4, 1] as Color,
};
