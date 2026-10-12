import type { SlotRef } from "../ecs/inventory/components";

// The HUD's own state: client-side, never part of the game world. Panels are
// placed relative to a corner of the screen so they stay put when the
// window resizes; dragging a panel later just changes its offset.

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

// Where a panel sits: `x`/`y` UI pixels in from its corner, measured to the
// panel's matching corner (so a bottom-right panel's bottom-right corner is
// x left of and y up from the screen's).
export type Placement = { corner: Corner; x: number; y: number };

export type PanelId = "equipment" | "inventory";

// A press on the HUD: on an item (to click or drag it) or on a panel (to
// move it). `at` is where it started, in UI pixels; it becomes a drag once
// the pointer moves far enough.
export type Press = {
  at: { x: number; y: number };
  dragging: boolean;
  item?: SlotRef;
  panel?: { id: PanelId; grab: { x: number; y: number } };
};

export type HudState = {
  panels: Record<PanelId, Placement>;
  // Where the pointer is, in UI pixels, while it's over the game.
  pointer?: { x: number; y: number };
  // The slot under the pointer, and since when (seconds), for tooltips.
  hover?: SlotRef;
  hoverSince?: number;
  press?: Press;
  // The last click on an item, for spotting double-clicks. `time` in seconds.
  lastClick?: { ref: SlotRef; time: number };
  // Slots that just had an item land in them, and when (seconds).
  flashes: { ref: SlotRef; at: number }[];
  // Whether panels can be dragged around. Off in play; a HUD edit mode will
  // turn it on.
  editMode: boolean;
};

export function createHudState(): HudState {
  return {
    panels: {
      equipment: { corner: "bottomRight", x: 6, y: 6 },
      // Just above equipment (12 UI pixels tall), one slot gap apart.
      inventory: { corner: "bottomRight", x: 6, y: 20 },
    },
    flashes: [],
    editMode: false,
  };
}

// A UI-pixel rectangle.
export type Rect = { x: number; y: number; w: number; h: number };

// The panel's top-left in UI pixels on a screen `screen` UI pixels across.
export function placePanel(
  placement: Placement,
  size: { w: number; h: number },
  screen: { w: number; h: number },
): { x: number; y: number } {
  const right =
    placement.corner === "topRight" || placement.corner === "bottomRight";
  const bottom =
    placement.corner === "bottomLeft" || placement.corner === "bottomRight";
  return {
    x: right ? screen.w - placement.x - size.w : placement.x,
    y: bottom ? screen.h - placement.y - size.h : placement.y,
  };
}

// CSS pixels per UI pixel. Each UI pixel is one art pixel, so 8x8 icons draw
// 48 CSS pixels across.
export const UI_SCALE = 6;

// Device pixels per UI pixel, a whole number so the HUD stays crisp.
export function uiPixel(devicePixelRatio: number): number {
  return Math.max(1, Math.round(UI_SCALE * devicePixelRatio));
}

const CORNERS: Corner[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

// Panel placements from saved data, keeping only what's valid and falling
// back to the defaults for the rest, so a stale or broken save can't lose a
// panel.
export function restorePanels(saved: unknown): HudState["panels"] {
  const panels = createHudState().panels;
  if (typeof saved !== "object" || saved === null) return panels;
  for (const id of Object.keys(panels) as PanelId[]) {
    const p = (saved as Record<string, unknown>)[id];
    if (typeof p !== "object" || p === null) continue;
    const { corner, x, y } = p as Record<string, unknown>;
    const valid =
      CORNERS.includes(corner as Corner) &&
      typeof x === "number" &&
      typeof y === "number" &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 0 &&
      y >= 0;
    // Whole UI pixels, in case an older save has fractions.
    if (valid) {
      panels[id] = {
        corner: corner as Corner,
        x: Math.round(x as number),
        y: Math.round(y as number),
      };
    }
  }
  return panels;
}
