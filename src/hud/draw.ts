import type { Color } from "../ecs/sprite/components";
import type { Entity, World } from "../ecs/world";
import { regionOf, type Art } from "../render/art";
import type { QuadBuffer } from "../render/quads";
import { OUTLINE_THICKNESS } from "../render/sprites";
import { layoutText, pushText } from "../render/textLayout";
import type { SlotRef } from "../ecs/inventory/components";
import type { ItemId } from "../ecs/inventory/items";
import { itemAt, sameSlot } from "../ecs/inventory/slots";
import {
  DRAGGED_FROM_ALPHA,
  HUD_COLORS,
  type HudElement,
  type PanelLayout,
} from "./elements";
import { equipmentPanel, equipmentView } from "./equipment";
import { inventoryPanel, inventoryView } from "./inventory";
import { placePanel, type HudState, type PanelId } from "./state";
import { itemTooltip, placeTooltip, tooltipPanel } from "./tooltip";

const NO_REGION = { x: 0, y: 0, w: 0, h: 0 };
const ICON_OUTLINE = { color: [0, 0, 0, 1] as Color };

// Lays out every panel that has something to show, placed on a screen
// `screen` UI pixels across. Returns each with its top-left in UI pixels.
export function layoutHud(
  world: World,
  player: Entity,
  state: HudState,
  screen: { w: number; h: number },
): { id: PanelId; x: number; y: number; layout: PanelLayout }[] {
  const panels: { id: PanelId; x: number; y: number; layout: PanelLayout }[] =
    [];
  const add = (id: PanelId, layout: PanelLayout) => {
    panels.push({
      id,
      ...placePanel(state.panels[id], layout, screen),
      layout,
    });
  };
  const equipment = equipmentView(world, player);
  if (equipment) add("equipment", equipmentPanel(equipment));
  const inventory = inventoryView(world, player);
  if (inventory) add("inventory", inventoryPanel(inventory));
  return panels;
}

// The UI-pixel size of a canvas `width` x `height` device pixels.
export function uiScreen(width: number, height: number, pixel: number) {
  return { w: Math.floor(width / pixel), h: Math.floor(height / pixel) };
}

// Draws the HUD in screen space, `pixel` device pixels per UI pixel, on a
// canvas `width` x `height` device pixels. The slot under the pointer is
// highlighted, and a dragged item follows the pointer, on top of everything,
// with a faint copy left where it came from.
export function drawHud(
  out: QuadBuffer,
  art: Art,
  world: World,
  player: Entity,
  state: HudState,
  width: number,
  height: number,
  pixel: number,
  time: number,
): void {
  const screen = uiScreen(width, height, pixel);
  const panels = layoutHud(world, player, state, screen);
  const dragged = state.press?.dragging ? state.press.item : undefined;
  const flashes = state.flashes.map((f) => ({
    ref: f.ref,
    strength: Math.max(0, 1 - (time - f.at) / FLASH_SECONDS),
  }));
  const look = { hover: state.hover, dragged, flashes };
  for (const panel of panels) {
    pushElements(
      out,
      art,
      panel.layout.elements,
      panel.x,
      panel.y,
      pixel,
      look,
    );
  }

  if (dragged && state.pointer) {
    const icon = panels
      .flatMap((p) => p.layout.elements)
      .find((e) => e.kind === "icon" && e.ref && sameSlot(e.ref, dragged));
    if (icon && icon.kind === "icon") {
      const rect = {
        x: -icon.rect.w / 2,
        y: -icon.rect.h / 2,
        w: icon.rect.w,
        h: icon.rect.h,
      };
      pushElements(
        out,
        art,
        [{ kind: "icon", rect, sprite: icon.sprite }],
        state.pointer.x,
        state.pointer.y,
        pixel,
      );
    }
  }

  const tooltip = hoveredItem(world, player, state, time);
  if (tooltip && state.pointer) {
    const regular = art.manifest.fonts.regular;
    const layout = tooltipPanel(
      itemTooltip(tooltip),
      (text) => layoutText(text, regular, art.glyphs).width,
    );
    // Tooltips are drawn at half the HUD's scale, so laid out and placed in
    // their own, smaller pixels.
    const tipPixel = tooltipPixel(pixel);
    const pointer = {
      x: (state.pointer.x * pixel) / tipPixel,
      y: (state.pointer.y * pixel) / tipPixel,
    };
    const at = placeTooltip(layout, pointer, uiScreen(width, height, tipPixel));
    pushElements(out, art, layout.elements, at.x, at.y, tipPixel);
  }
}

// Device pixels per tooltip pixel: half the HUD's, in whole device pixels.
export function tooltipPixel(pixel: number): number {
  return Math.max(1, Math.round(pixel / 2));
}

// The item to show a tooltip for: the one under the pointer once it's been
// hovered long enough, and not while dragging.
function hoveredItem(
  world: World,
  player: Entity,
  state: HudState,
  time: number,
): ItemId | undefined {
  if (!state.hover || state.press?.dragging) return undefined;
  if (
    state.hoverSince === undefined ||
    time - state.hoverSince < TOOLTIP_DELAY
  ) {
    return undefined;
  }
  const equipment = world.components.equipment.get(player);
  const inventory = world.components.inventory.get(player);
  if (!equipment || !inventory) return undefined;
  return itemAt({ equipment, inventory }, state.hover)?.def;
}

// How to draw elements beyond what they say: which slot is hovered, which
// item is being dragged out of its slot, and which slots are flashing (from
// 1 just after an item landed, fading to 0).
export type ElementLook = {
  hover?: SlotRef;
  dragged?: SlotRef;
  flashes?: { ref: SlotRef; strength: number }[];
};

// How long a slot flashes after an item lands in it, and how long an item
// has to be hovered before its tooltip shows, in seconds.
export const FLASH_SECONDS = 0.35;
export const TOOLTIP_DELAY = 0.3;
const WHITE: Color = [1, 1, 1, 1];

// Turns elements into quads, with the panel's top-left at UI pixel (x, y).
export function pushElements(
  out: QuadBuffer,
  art: Art,
  elements: HudElement[],
  x: number,
  y: number,
  pixel: number,
  look: ElementLook = {},
): void {
  for (const element of elements) {
    if (element.kind === "box") {
      const { rect } = element;
      const hovered =
        element.ref && look.hover && sameSlot(element.ref, look.hover);
      const flash = element.ref
        ? (look.flashes?.find((f) => sameSlot(f.ref, element.ref!))?.strength ??
          0)
        : 0;
      const border = mix(
        hovered ? HUD_COLORS.hoverBorder : element.border,
        WHITE,
        flash,
      );
      fill(out, x + rect.x, y + rect.y, rect.w, rect.h, border, pixel);
      fill(
        out,
        x + rect.x + 1,
        y + rect.y + 1,
        rect.w - 2,
        rect.h - 2,
        element.fill,
        pixel,
      );
    } else if (element.kind === "icon") {
      const { rect } = element;
      const pad = OUTLINE_THICKNESS * pixel;
      const left = (x + rect.x) * pixel - pad;
      const top = (y + rect.y) * pixel - pad;
      const right = (x + rect.x + rect.w) * pixel + pad;
      const bottom = (y + rect.y + rect.h) * pixel + pad;
      const file = art.manifest.sprites[element.sprite];
      if (!file || file.kind !== "static") continue;
      const faded =
        element.ref && look.dragged && sameSlot(element.ref, look.dragged);
      out.push(
        left,
        top,
        right,
        top,
        right,
        bottom,
        left,
        bottom,
        regionOf(art, file.file),
        {
          margin: OUTLINE_THICKNESS,
          outline: ICON_OUTLINE,
          tint: faded ? [1, 1, 1, DRAGGED_FROM_ALPHA] : undefined,
        },
      );
    } else if (element.kind === "text") {
      pushText(
        out,
        art,
        element.text,
        (x + element.x) * pixel,
        (y + element.y) * pixel,
        {
          font: element.font,
          pixel,
          tint: element.tint,
          align: element.align,
        },
      );
    }
  }
}

function fill(
  out: QuadBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color,
  pixel: number,
): void {
  const left = x * pixel;
  const top = y * pixel;
  const right = (x + w) * pixel;
  const bottom = (y + h) * pixel;
  out.push(left, top, right, top, right, bottom, left, bottom, NO_REGION, {
    outline: { color },
    fill: true,
  });
}

function mix(a: Color, b: Color, amount: number): Color {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
    a[3] + (b[3] - a[3]) * amount,
  ];
}
