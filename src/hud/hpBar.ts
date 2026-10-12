import type { Color } from "../ecs/sprite/components";
import { healthColor } from "../render/healthBars";
import type { HudElement, PanelLayout } from "./elements";

// A big health bar for the HUD: the player's now, a boss's later. It only
// draws what it's given, so anything with health can have one.

// Drawn at half the HUD's size: each of the bar's pixels is half a UI pixel.
export const HP_BAR_SCALE = 2;
// In the bar's own pixels: a 1-pixel frame around a fill with a pixel of
// room above and below the regular font's 7-pixel digits.
const BORDER = 1;
const PADDING = 1;
const TEXT_HEIGHT = 7;
export const HP_BAR_HEIGHT = 2 * (BORDER + PADDING) + TEXT_HEIGHT;

// After damage, the lost slice shows white for HOLD seconds, then shrinks
// down to the new health over SHRINK seconds.
export const HP_CHUNK_HOLD = 0.15;
export const HP_CHUNK_SHRINK = 0.4;

export const HP_BAR_COLORS = {
  frame: [0.05, 0.05, 0.06, 0.92] as Color,
  empty: [0.16, 0.15, 0.18, 1] as Color,
  chunk: [1, 1, 1, 1] as Color,
  text: [1, 1, 1, 1] as Color,
  textOutline: [0, 0, 0, 1] as Color,
};

// What a bar remembers between frames to animate the white chunk: the
// health it last saw, and the chunk's top (in health) as of `at` seconds,
// when it started holding.
export type HpBarState = {
  hp: number;
  chunk?: { top: number; at: number };
};

// Updates a bar's memory with this frame's health. Taking damage starts a
// chunk from the old health, or from wherever a shrinking chunk has got to
// if that's higher; healing just raises the fill.
export function stepHpBar(
  state: HpBarState | undefined,
  hp: number,
  time: number,
): HpBarState {
  if (!state) return { hp };
  if (hp >= state.hp) return { ...state, hp };
  const top = Math.max(state.hp, chunkTop(state, time) ?? 0);
  return { hp, chunk: { top, at: time } };
}

// How high the white chunk reaches at `time`, in health, or undefined once
// it has shrunk away.
export function chunkTop(state: HpBarState, time: number): number | undefined {
  const { chunk } = state;
  if (!chunk) return undefined;
  const shrinking = time - chunk.at - HP_CHUNK_HOLD;
  const t = Math.max(0, Math.min(1, shrinking / HP_CHUNK_SHRINK));
  // Eases in: starts slow, then speeds up into the new health.
  const top = chunk.top + (state.hp - chunk.top) * t ** 3;
  return top > state.hp ? top : undefined;
}

// The bar `uiWidth` UI pixels wide: a dark frame, health filled from the
// left in healthColor, the white chunk above it up to `chunk` (in health),
// and "hp/max" centered on top. Laid out in its own, smaller pixels (see
// HP_BAR_SCALE).
export function hpBar(
  health: { hp: number; max: number },
  chunk: number | undefined,
  uiWidth: number,
): PanelLayout {
  const width = uiWidth * HP_BAR_SCALE;
  const inner = {
    x: BORDER,
    y: BORDER,
    w: width - 2 * BORDER,
    h: HP_BAR_HEIGHT - 2 * BORDER,
  };
  const widthOf = (hp: number) =>
    inner.w * Math.max(0, Math.min(1, hp / health.max));
  const filled = widthOf(health.hp);
  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w: width, h: HP_BAR_HEIGHT },
      fill: HP_BAR_COLORS.empty,
      border: HP_BAR_COLORS.frame,
    },
  ];
  if (filled > 0) {
    elements.push({
      kind: "rect",
      rect: { ...inner, w: filled },
      fill: healthColor(health.hp / health.max),
    });
  }
  if (chunk !== undefined && widthOf(chunk) > filled) {
    elements.push({
      kind: "rect",
      rect: { ...inner, x: inner.x + filled, w: widthOf(chunk) - filled },
      fill: HP_BAR_COLORS.chunk,
    });
  }
  elements.push({
    kind: "text",
    x: width / 2,
    y: BORDER + PADDING,
    text: `${Math.ceil(health.hp)}/${health.max}`,
    font: "regular",
    tint: HP_BAR_COLORS.text,
    outline: HP_BAR_COLORS.textOutline,
    align: "center",
  });
  return {
    w: uiWidth,
    h: HP_BAR_HEIGHT / HP_BAR_SCALE,
    scale: HP_BAR_SCALE,
    elements,
  };
}
