import { ITEM_CATEGORIES, type ItemDef } from "../ecs/inventory/items";
import type { ProjectileDef } from "../ecs/projectile/definitions";
import { pathOffset } from "../ecs/projectile/path";
import type { Color } from "../ecs/sprite/components";
import { HUD_COLORS, type HudElement, type PanelLayout } from "./elements";
import { KIND_LABELS } from "./items";

export type TooltipLine = { text: string; color: Color };

export const TOOLTIP_COLORS = {
  name: HUD_COLORS.title,
  kind: [0.55, 0.53, 0.58, 1] as Color,
  stat: [0.88, 0.88, 0.9, 1] as Color,
  trait: [0.55, 0.8, 0.95, 1] as Color,
};

// What a tooltip says about an item, worked out from its definitions so it
// can't drift from how the item actually behaves.
export function itemTooltip(item: ItemDef): TooltipLine[] {
  const lines: TooltipLine[] = [
    { text: item.name, color: TOOLTIP_COLORS.name },
    {
      text:
        item.category === ITEM_CATEGORIES.CONSUMABLE
          ? "Consumable"
          : KIND_LABELS[item.kind].name,
      color: TOOLTIP_COLORS.kind,
    },
  ];
  if (item.category === ITEM_CATEGORIES.CONSUMABLE || !item.weapon)
    return lines;

  const weapon = item.weapon;
  // Each kind of projectile in a shot, with how many of it.
  const kinds = new Map<ProjectileDef, number>();
  for (const { projectile } of weapon.fires) {
    kinds.set(projectile, (kinds.get(projectile) ?? 0) + 1);
  }
  const damage = [...kinds].map(
    ([
      {
        damage: [min, max],
      },
      count,
    ]) => (count > 1 ? `${min}-${max} x${count}` : `${min}-${max}`),
  );
  const farthest = Math.max(...[...kinds.keys()].map(range));
  lines.push(
    { text: `Damage: ${damage.join(", ")}`, color: TOOLTIP_COLORS.stat },
    { text: `Rate: ${round(weapon.rate)}/s`, color: TOOLTIP_COLORS.stat },
    { text: `Range: ${round(farthest)} tiles`, color: TOOLTIP_COLORS.stat },
  );
  const allTraits = new Set([...kinds.keys()].flatMap(traits));
  for (const trait of allTraits) {
    lines.push({ text: trait, color: TOOLTIP_COLORS.trait });
  }
  return lines;
}

// How far from where it was fired a projectile gets, following its actual
// path (so boomerangs, spirals and slowing shots are measured right).
export function range(def: ProjectileDef): number {
  const steps = 200;
  let farthest = 0;
  for (let i = 0; i <= steps; i++) {
    const { x, y } = pathOffset(def, (def.lifetime * i) / steps);
    farthest = Math.max(farthest, Math.hypot(x, y));
  }
  return farthest;
}

function traits(def: ProjectileDef): string[] {
  const out: string[] = [];
  if (def.pierces) out.push("Pierces enemies");
  if (def.armorPiercing) out.push("Ignores defense");
  if (def.walls === "pass") out.push("Passes through walls");
  if (def.walls === "slide") out.push("Skids along walls");
  if (def.boomerang) out.push("Returns");
  if (def.wave) out.push("Weaves");
  if (def.turnRate || def.turnAcceleration) out.push("Curves");
  if (def.acceleration && def.acceleration > 0) out.push("Speeds up");
  if (def.acceleration && def.acceleration < 0) out.push("Slows down");
  return out;
}

function round(value: number): string {
  return String(Math.round(value * 10) / 10);
}

// In UI pixels: text lines 9 apart inside a 3-pixel margin.
const LINE = 9;
const PAD = 3;

// A box sized to fit `lines`, each measured in UI pixels by `measure`.
export function tooltipPanel(
  lines: TooltipLine[],
  measure: (text: string) => number,
): PanelLayout {
  const w = Math.max(0, ...lines.map((l) => measure(l.text))) + PAD * 2;
  const h = lines.length * LINE - 1 + PAD * 2;
  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w, h },
      fill: HUD_COLORS.panel,
      border: HUD_COLORS.panelBorder,
    },
    ...lines.map((line, i): HudElement => ({
      kind: "text",
      x: PAD,
      y: PAD + i * LINE,
      text: line.text,
      font: "regular",
      tint: line.color,
    })),
  ];
  return { w, h, elements };
}

// Where a tooltip goes: beside the pointer, flipped to the other side or
// nudged in when it would run off the screen.
export function placeTooltip(
  size: { w: number; h: number },
  pointer: { x: number; y: number },
  screen: { w: number; h: number },
): { x: number; y: number } {
  const gap = 4;
  let x = pointer.x + gap;
  if (x + size.w > screen.w) x = pointer.x - gap - size.w;
  let y = pointer.y - size.h - gap;
  if (y < 0) y = pointer.y + gap;
  return {
    x: Math.round(Math.max(0, Math.min(x, screen.w - size.w))),
    y: Math.round(Math.max(0, Math.min(y, screen.h - size.h))),
  };
}
