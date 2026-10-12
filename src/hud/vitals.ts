import type { StatValue } from "../ecs/stats/components";
import type { Color } from "../ecs/sprite/components";
import { hpBar } from "./hpBar";
import type { HudElement, PanelLayout } from "./elements";

const MANA_FILL = [0.2, 0.45, 0.95, 1] as Color;
const GAP = 3;

// HP and MP share one attached panel so containers can remain anchored above
// both without knowing anything about either resource.
export function vitalsPanel(
  health: StatValue,
  mana: StatValue | undefined,
  chunk: number | undefined,
  uiWidth: number,
): PanelLayout {
  const healthLayout = hpBar(health, chunk, uiWidth);
  if (!mana) return healthLayout;

  const manaLayout = resourceBar(mana, MANA_FILL, uiWidth);
  const offset = healthLayout.h * healthLayout.scale! + GAP;
  return {
    w: uiWidth,
    h: (offset + manaLayout.h * manaLayout.scale!) / healthLayout.scale!,
    scale: healthLayout.scale,
    elements: [
      ...healthLayout.elements,
      ...manaLayout.elements.map((element) => shiftDown(element, offset)),
    ],
  };
}

function resourceBar(
  resource: StatValue,
  fill: Color,
  uiWidth: number,
): PanelLayout {
  const layout = hpBar(resource, undefined, uiWidth);
  return {
    ...layout,
    elements: layout.elements.map((element) =>
      element.kind === "rect" ? { ...element, fill } : element,
    ),
  };
}

function shiftDown(element: HudElement, amount: number): HudElement {
  if (element.kind === "text") return { ...element, y: element.y + amount };
  if ("rect" in element) {
    return {
      ...element,
      rect: { ...element.rect, y: element.rect.y + amount },
    };
  }
  return element;
}
