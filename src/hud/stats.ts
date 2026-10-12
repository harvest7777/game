import type { Entity, World } from "../ecs/world";
import { ATTRIBUTE_STATS, STAT, type StatValue } from "../ecs/stats/components";
import type { Color } from "../ecs/sprite/components";
import { HUD_COLORS, type HudElement, type PanelLayout } from "./elements";

// Drawn at a third of the HUD's size, like the vitals' numbers, so the
// panel reads as detail beside the items rather than competing with them.
const SCALE = 3;
const PADDING = 3;
const COLUMN_GAP = 6;
const ROW_HEIGHT = 9;
const HEIGHT = PADDING * 2 + ROW_HEIGHT * 3;

// How wide a piece of text is in font pixels.
export type MeasureText = (text: string) => number;

// Without the real glyph widths (in tests, say), assume every character is
// as wide as the widest glyph, 8 font pixels, so text never overflows.
export const WIDEST_GLYPHS: MeasureText = (text) => text.length * 8;

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

// Two columns of stats, each as wide as its widest text by `measure`, the
// panel kept a whole number of UI pixels across.
export function statsPanel(
  view: StatsView,
  measure: MeasureText = WIDEST_GLYPHS,
): PanelLayout {
  const lines = [...view]
    .sort((a, b) => META[a.kind].order - META[b.kind].order)
    .map(({ kind, value }) => ({
      order: META[kind].order,
      text: `${META[kind].label} ${format(value.value)}/${format(value.max)}`,
      tint: value.value >= value.max ? CAPPED : TEXT,
    }));
  const columnWidth = Math.max(...lines.map((line) => measure(line.text)));
  const width =
    Math.ceil((PADDING * 2 + columnWidth * 2 + COLUMN_GAP) / SCALE) * SCALE;

  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w: width, h: HEIGHT },
      fill: HUD_COLORS.panel,
      border: HUD_COLORS.panelBorder,
    },
    ...lines.map(({ order, text, tint }): HudElement => ({
      kind: "text",
      x: PADDING + (order % 2) * (columnWidth + COLUMN_GAP),
      y: PADDING + Math.floor(order / 2) * ROW_HEIGHT,
      text,
      font: "regular",
      tint,
    })),
  ];

  return { w: width / SCALE, h: HEIGHT / SCALE, scale: SCALE, elements };
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
