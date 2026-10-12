import type { SlotRef } from "../ecs/inventory/components";
import type { Command } from "../ecs/input/commands";
import type { Vec2 } from "../ecs/shared/physics/math";
import type { PanelLayout } from "./elements";
import { sameSlot } from "../ecs/inventory/slots";
import {
  placePanel,
  type Corner,
  type HudState,
  type PanelId,
  type Placement,
} from "./state";

// A panel where it's drawn, top-left in UI pixels.
export type PlacedPanel = {
  id: PanelId;
  x: number;
  y: number;
  layout: PanelLayout;
};

// What's under a point.
export type Hit = {
  panel: PanelId;
  // The item slot, if the point is on one.
  slot?: SlotRef;
  // Whether that slot holds an item.
  hasItem: boolean;
};

// The topmost panel under `point` (UI pixels), and the slot there if any.
export function hitTest(panels: PlacedPanel[], point: Vec2): Hit | undefined {
  for (let i = panels.length - 1; i >= 0; i--) {
    const panel = panels[i];
    const x = point.x - panel.x;
    const y = point.y - panel.y;
    if (x < 0 || y < 0 || x >= panel.layout.w || y >= panel.layout.h) continue;

    for (const element of panel.layout.elements) {
      if (element.kind !== "slot" || !inside(element.rect, x, y)) continue;
      const hasItem = panel.layout.elements.some(
        (e) =>
          e.kind === "icon" &&
          e.ref !== undefined &&
          sameSlot(e.ref, element.ref),
      );
      return { panel: panel.id, slot: element.ref, hasItem };
    }
    return { panel: panel.id, hasItem: false };
  }
  return undefined;
}

export type PointerEvent =
  | { kind: "move"; x: number; y: number; time?: number }
  | { kind: "down"; x: number; y: number; time: number }
  | { kind: "up"; x: number; y: number; time: number }
  | { kind: "leave" };

// UI pixels a press has to move before it counts as a drag.
export const DRAG_THRESHOLD = 2;
// Seconds between two clicks on a slot for a double-click.
export const DOUBLE_CLICK = 0.35;

// Updates the HUD for one pointer event and returns the commands it asks
// for. `used` says whether the HUD took the event (it was over a panel, or
// part of a drag), so the game shouldn't also act on it. Items can be
// clicked and dragged in play; in edit mode, presses grab whole panels
// instead, which snap to their nearest screen corner when dropped.
export function hudPointer(
  state: HudState,
  event: PointerEvent,
  panels: PlacedPanel[],
  screen: { w: number; h: number },
): { commands: Command[]; used: boolean } {
  const commands: Command[] = [];

  if (event.kind === "leave") {
    state.pointer = undefined;
    state.hover = undefined;
    return { commands, used: false };
  }

  const point = { x: event.x, y: event.y };
  state.pointer = point;
  const hit = hitTest(panels, point);
  const before = state.hover;
  state.hover = hit?.slot;
  const changed =
    !before || !state.hover
      ? before !== state.hover
      : !sameSlot(before, state.hover);
  if (changed && "time" in event) state.hoverSince = event.time;
  const press = state.press;

  if (event.kind === "down") {
    if (!hit) return { commands, used: false };
    if (hit.slot && hit.hasItem && !state.editMode) {
      state.press = { at: point, dragging: false, item: hit.slot };
    } else if (state.editMode) {
      // In edit mode, pressing anywhere on a panel grabs the whole panel.
      const panel = panels.find((p) => p.id === hit.panel)!;
      state.press = {
        at: point,
        dragging: false,
        panel: {
          id: panel.id,
          grab: { x: point.x - panel.x, y: point.y - panel.y },
        },
      };
    }
    return { commands, used: true };
  }

  if (event.kind === "move") {
    if (!press) return { commands, used: hit !== undefined };
    if (
      !press.dragging &&
      Math.hypot(point.x - press.at.x, point.y - press.at.y) > DRAG_THRESHOLD
    ) {
      press.dragging = true;
    }
    if (press.dragging && press.panel)
      movePanel(state, panels, press.panel, point, screen);
    return { commands, used: true };
  }

  // Up.
  if (!press) return { commands, used: hit !== undefined };
  state.press = undefined;

  if (press.panel) {
    if (press.dragging)
      snapToNearestCorner(state, panels, press.panel.id, screen);
    return { commands, used: true };
  }

  const from = press.item!;
  if (press.dragging) {
    if (hit?.slot && !sameSlot(hit.slot, from)) {
      commands.push({ kind: "move", from, to: hit.slot });
    }
    state.lastClick = undefined;
    return { commands, used: true };
  }

  const last = state.lastClick;
  if (
    last &&
    sameSlot(last.ref, from) &&
    event.time - last.time <= DOUBLE_CLICK
  ) {
    state.lastClick = undefined;
    const command = useItem(from, panels);
    if (command) commands.push(command);
  } else {
    state.lastClick = { ref: from, time: event.time };
  }
  return { commands, used: true };
}

// Double-clicking an item: equip it from the inventory, or put a worn item
// back in the first empty inventory slot.
function useItem(ref: SlotRef, panels: PlacedPanel[]): Command | undefined {
  if (ref.in === "inventory") return { kind: "equip", index: ref.index };
  const empty = firstEmptyInventorySlot(panels);
  return empty === undefined
    ? undefined
    : { kind: "move", from: ref, to: empty };
}

function firstEmptyInventorySlot(panels: PlacedPanel[]): SlotRef | undefined {
  const inventory = panels.find((p) => p.id === "inventory");
  if (!inventory) return undefined;
  const filled = inventory.layout.elements.flatMap((e) =>
    e.kind === "icon" && e.ref ? [e.ref] : [],
  );
  for (const element of inventory.layout.elements) {
    if (element.kind !== "slot") continue;
    if (!filled.some((ref) => sameSlot(ref, element.ref))) return element.ref;
  }
  return undefined;
}

// Moves a panel so the grabbed point follows the pointer, kept on screen.
function movePanel(
  state: HudState,
  panels: PlacedPanel[],
  drag: { id: PanelId; grab: Vec2 },
  point: Vec2,
  screen: { w: number; h: number },
): void {
  const panel = panels.find((p) => p.id === drag.id);
  if (!panel) return;
  // Whole UI pixels, so the panel stays on the pixel grid.
  const left = clamp(
    Math.round(point.x - drag.grab.x),
    0,
    screen.w - panel.layout.w,
  );
  const top = clamp(
    Math.round(point.y - drag.grab.y),
    0,
    screen.h - panel.layout.h,
  );
  state.panels[drag.id] = fromTopLeft(
    state.panels[drag.id].corner,
    { x: left, y: top },
    panel.layout,
    screen,
  );
}

// Re-anchors a panel to whichever screen corner its middle is nearest, so it
// keeps that relationship when the window resizes.
function snapToNearestCorner(
  state: HudState,
  panels: PlacedPanel[],
  id: PanelId,
  screen: { w: number; h: number },
): void {
  const panel = panels.find((p) => p.id === id);
  if (!panel) return;
  const current = state.panels[id];
  const topLeft = placePanel(current, panel.layout, screen);
  const right = topLeft.x + panel.layout.w / 2 > screen.w / 2;
  const bottom = topLeft.y + panel.layout.h / 2 > screen.h / 2;
  const corner: Corner = bottom
    ? right
      ? "bottomRight"
      : "bottomLeft"
    : right
      ? "topRight"
      : "topLeft";
  state.panels[id] = fromTopLeft(corner, topLeft, panel.layout, screen);
}

function fromTopLeft(
  corner: Corner,
  topLeft: Vec2,
  size: { w: number; h: number },
  screen: { w: number; h: number },
): Placement {
  const right = corner === "topRight" || corner === "bottomRight";
  const bottom = corner === "bottomLeft" || corner === "bottomRight";
  return {
    corner,
    x: right ? screen.w - topLeft.x - size.w : topLeft.x,
    y: bottom ? screen.h - topLeft.y - size.h : topLeft.y,
  };
}

function inside(
  rect: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
) {
  return (
    x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
