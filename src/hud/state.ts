// The HUD's own state: client-side, never part of the game world. Panels are
// placed relative to a corner of the screen so they stay put when the
// window resizes; dragging a panel later just changes its offset.

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

// Where a panel sits: `x`/`y` UI pixels in from its corner, measured to the
// panel's matching corner (so a bottom-right panel's bottom-right corner is
// x left of and y up from the screen's).
export type Placement = { corner: Corner; x: number; y: number };

export type PanelId = "equipment";

export type HudState = { panels: Record<PanelId, Placement> };

export function createHudState(): HudState {
  return {
    panels: { equipment: { corner: "bottomRight", x: 6, y: 6 } },
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
// 32 CSS pixels across.
export const UI_SCALE = 4;

// Device pixels per UI pixel, a whole number so the HUD stays crisp.
export function uiPixel(devicePixelRatio: number): number {
  return Math.max(1, Math.round(UI_SCALE * devicePixelRatio));
}
