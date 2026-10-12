import type { Entity, World } from "../ecs/world";
import { ATTRIBUTE_STATS, STAT, type StatValue } from "../ecs/stats/components";
import type { Color } from "../ecs/sprite/components";
import { HUD_COLORS, type HudElement, type PanelLayout } from "./elements";

// Drawn at a third of the HUD's size, like the vitals' numbers, so the
// panel reads as detail beside the items rather than competing with them.
const SCALE = 3;
const PADDING = 3;
// Wide enough for "ATT 25/75", and keeping the panel a whole number of UI
// pixels across at a third of the size.
const COLUMN_WIDTH = 51;
const COLUMN_GAP = 6;
const WIDTH = PADDING * 2 + COLUMN_WIDTH * 2 + COLUMN_GAP;
const ROW_HEIGHT = 9;
const HEIGHT = PADDING * 2 + ROW_HEIGHT * 3;

const TEXT = [0.9, 0.9, 0.94, 1] as Color;
const CAPPED = [0.4, 0.95, 0.45, 1] as Color;

const META: Record<
  (typeof ATTRIBUTE_STATS)[number],
  { label: string; order: number }
> = {
  [STAT.ATTACK]: { label: "ATT", order: 0 },
  [STAT.DEFENSE]: { label: "DEF", order: 1 },
  [STAT.SPEED]: { label: "SPD", order: 2 },
  [STAT.DEXTERITY]: { label: "DEX", order: 3 },
  [STAT.VITALITY]: { label: "VIT", order: 4 },
  [STAT.WISDOM]: { label: "WIS", order: 5 },
};

export type AttributeStatKind = (typeof ATTRIBUTE_STATS)[number];
export type StatsView = { kind: AttributeStatKind; value: StatValue }[];

export function statsView(world: World, entity: Entity): StatsView | undefined {
  const view = ATTRIBUTE_STATS.flatMap((kind) => {
    const value = world.components[kind].get(entity);
    return value ? [{ kind, value }] : [];
  });
  return view.length === ATTRIBUTE_STATS.length ? view : undefined;
}

export function statsPanel(view: StatsView): PanelLayout {
  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w: WIDTH, h: HEIGHT },
      fill: HUD_COLORS.panel,
      border: HUD_COLORS.panelBorder,
    },
  ];

  for (const { kind, value } of [...view].sort(
    (a, b) => META[a.kind].order - META[b.kind].order,
  )) {
    const order = META[kind].order;
    const column = order % 2;
    const row = Math.floor(order / 2);
    const x = PADDING + column * (COLUMN_WIDTH + COLUMN_GAP);
    const y = PADDING + row * ROW_HEIGHT;
    elements.push({
      kind: "text",
      x,
      y,
      text: `${META[kind].label} ${format(value.value)}/${format(value.max)}`,
      font: "regular",
      tint: value.value >= value.max ? CAPPED : TEXT,
    });
  }

  return { w: WIDTH / SCALE, h: HEIGHT / SCALE, scale: SCALE, elements };
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
