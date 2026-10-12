import type { Color } from "../ecs/sprite/components";
import type { Entity, World } from "../ecs/world";
import { regionOf, type Art } from "../render/art";
import type { QuadBuffer } from "../render/quads";
import { OUTLINE_THICKNESS } from "../render/sprites";
import { pushText } from "../render/textLayout";
import type { HudElement, PanelLayout } from "./elements";
import { equipmentPanel, equipmentView } from "./equipment";
import { placePanel, type HudState, type PanelId } from "./state";

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
  const equipment = equipmentView(world, player);
  if (equipment) {
    const layout = equipmentPanel(equipment);
    const at = placePanel(state.panels.equipment, layout, screen);
    panels.push({ id: "equipment", ...at, layout });
  }
  return panels;
}

// Draws the HUD in screen space, `pixel` device pixels per UI pixel, on a
// canvas `width` x `height` device pixels.
export function drawHud(
  out: QuadBuffer,
  art: Art,
  world: World,
  player: Entity,
  state: HudState,
  width: number,
  height: number,
  pixel: number,
): void {
  const screen = {
    w: Math.floor(width / pixel),
    h: Math.floor(height / pixel),
  };
  for (const panel of layoutHud(world, player, state, screen)) {
    pushElements(out, art, panel.layout.elements, panel.x, panel.y, pixel);
  }
}

// Turns elements into quads, with the panel's top-left at UI pixel (x, y).
export function pushElements(
  out: QuadBuffer,
  art: Art,
  elements: HudElement[],
  x: number,
  y: number,
  pixel: number,
): void {
  for (const element of elements) {
    if (element.kind === "box") {
      const { rect } = element;
      fill(out, x + rect.x, y + rect.y, rect.w, rect.h, element.border, pixel);
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
