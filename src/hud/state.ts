import type { SlotRef } from "../ecs/inventory/components";
import type { HpBarState } from "./hpBar";

// The HUD's own state: client-side, never part of the game world. Panels are
// placed relative to a corner of the screen so they stay put when the
// window resizes; dragging a panel later just changes its offset.

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
export type DockedPanelId = "health" | "equipment" | "inventory" | "stats";
export type PanelId = DockedPanelId | "container";

// Where a panel sits: `x`/`y` UI pixels in from its corner, measured to the
// panel's matching corner (so a bottom-right panel's bottom-right corner is
// x left of and y up from the screen's).
export type Placement = { corner: Corner; x: number; y: number };

// A panel placed against another, `gap` UI pixels away: `above` it with
// their left edges lined up, or to its `right` with their bottoms lined up.
// It moves with that panel, so only the panel at the root of a group is
// placed on the screen.
export type Attachment = {
  to: DockedPanelId;
  side: "above" | "right" | "left";
  gap: number;
};

// Which panels sit in a corner of the screen, and which hang off them.
export type Panels = {
  equipment: Placement;
  health: Attachment;
  inventory: Attachment;
  stats: Attachment;
};

// A press on the HUD: on an item (to click or drag it) or on a panel (to
// move it). `at` is where it started, in UI pixels; it becomes a drag once
// the pointer moves far enough.
export type Press = {
  at: { x: number; y: number };
  dragging: boolean;
  item?: SlotRef;
  // Always a screen-placed panel: grabbing an attached one grabs its group.
  panel?: { id: CornerPanelId; grab: { x: number; y: number } };
};

// Panels placed on the screen rather than against another panel.
export type CornerPanelId = {
  [K in keyof Panels]: Panels[K] extends Placement ? K : never;
}[keyof Panels];

export type HudState = {
  panels: Panels;
  // What each big health bar remembers, to animate damage. Keyed by whose
  // bar it is: "player" now, bosses later.
  hpBars: Record<string, HpBarState>;
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
  // Whether the inventory panel is shown (toggled by a hotkey).
  inventoryOpen: boolean;
  // Whether panels can be dragged around. Off in play; a HUD edit mode will
  // turn it on.
  editMode: boolean;
};

export function createHudState(): HudState {
  return {
    panels: {
      // In from the bottom-right corner, leaving room for the inventory (54
      // UI pixels wide) to its right.
      equipment: { corner: "bottomRight", x: 62, y: 6 },
      health: { to: "equipment", side: "above", gap: 2 },
      inventory: { to: "equipment", side: "right", gap: 2 },
      stats: { to: "equipment", side: "left", gap: 2 },
    },
    hpBars: {},
    inventoryOpen: true,
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

// Where a panel's top-left ends up, given where the panel it's attached to
// is and how big both are.
export function attachPanel(
  attachment: Attachment,
  to: { x: number; y: number; w: number; h: number },
  size: { w: number; h: number },
): { x: number; y: number } {
  if (attachment.side === "above") {
    return { x: to.x, y: to.y - attachment.gap - size.h };
  }
  if (attachment.side === "left") {
    return { x: to.x - attachment.gap - size.w, y: to.y + to.h - size.h };
  }
  return { x: to.x + to.w + attachment.gap, y: to.y + to.h - size.h };
}

const CORNER_PANELS: CornerPanelId[] = ["equipment"];

// Panel placements from saved data, keeping only what's valid and falling
// back to the defaults for the rest, so a stale or broken save can't lose a
// panel. Only screen-placed panels are saved; attached ones follow them.
export function restorePanels(saved: unknown): HudState["panels"] {
  const panels = createHudState().panels;
  if (typeof saved !== "object" || saved === null) return panels;
  for (const id of CORNER_PANELS) {
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
