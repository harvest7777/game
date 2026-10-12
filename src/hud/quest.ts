import type { Vec2 } from "../ecs/shared/physics/math";
import { firstFrame } from "../ecs/sprite/art";
import type { Color } from "../ecs/sprite/components";
import type { Entity, World } from "../ecs/world";
import { regionOf, type Art } from "../render/art";
import { QUEST_ARROW } from "../render/assets";
import { healthColor } from "../render/healthBars";
import type { QuadBuffer } from "../render/quads";
import { interpolatedPosition, OUTLINE_THICKNESS } from "../render/sprites";
import { pushText } from "../render/textLayout";
import { worldToScreen, type View } from "../render/view";
import { pushElements, tooltipPixel } from "./draw";
import { HUD_COLORS, type HudElement } from "./elements";

// Where the quest pointer goes: a spot `inset` in from the screen's edge on
// the line from the screen's middle toward the quest, and which way that
// line points (radians, clockwise from screen right).
export type QuestPointer = { x: number; y: number; angle: number };

// The quest nearest to `from`, if there is one.
export function currentQuest(world: World, from: Vec2): Entity | undefined {
  let nearest: Entity | undefined;
  let nearestDistance = Infinity;
  for (const [entity] of world.components.quest) {
    const at = world.components.position.get(entity);
    if (!at) continue;
    const distance = Math.hypot(at.x - from.x, at.y - from.y);
    if (distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  return nearest;
}

// The pointer toward a quest at `questAt` on a `screen`-sized screen, both
// in the same pixels, or undefined while the quest is on screen. Pure
// screen geometry: turning the camera already moved `questAt`.
export function questPointer(
  questAt: Vec2,
  screen: { w: number; h: number },
  inset: number,
): QuestPointer | undefined {
  const onScreen =
    questAt.x >= 0 &&
    questAt.y >= 0 &&
    questAt.x <= screen.w &&
    questAt.y <= screen.h;
  if (onScreen) return undefined;
  const cx = screen.w / 2;
  const cy = screen.h / 2;
  const dx = questAt.x - cx;
  const dy = questAt.y - cy;
  // How far along the line the inset edge is, whichever edge it meets first.
  const reachX = dx === 0 ? Infinity : Math.max(0, cx - inset) / Math.abs(dx);
  const reachY = dy === 0 ? Infinity : Math.max(0, cy - inset) / Math.abs(dy);
  const t = Math.min(reachX, reachY);
  return { x: cx + dx * t, y: cy + dy * t, angle: Math.atan2(dy, dx) };
}

// The pointer's portrait card, in UI pixels: a slot-sized frame around the
// quest's portrait with its health under it. The arrow sits just outside
// the card, toward the quest.
const CARD = 12;
const BAR_GAP = 1;
const BAR_HEIGHT = 2;
const ARROW = 8;
// From the card's middle to the arrow's.
const ARROW_REACH = CARD / 2 + ARROW / 2 + 1;
// How far the card's middle stays from the screen's edge, so the card,
// arrow and distance all fit.
const INSET = ARROW_REACH + ARROW / 2 + 2;

const BAR_BACK: Color = [0.1, 0.1, 0.1, 1];
const DISTANCE_TINT: Color = [1, 1, 1, 1];
const BLACK: Color = [0, 0, 0, 1];

// Draws the pointer toward the quest nearest the player while it's off
// screen: an arrow on the screen's edge, the quest's portrait and health,
// and how far away it is in tiles. Nothing while there's no player, no
// quest, or the quest is in view. `pixel` is device pixels per UI pixel.
export function pushQuestPointer(
  out: QuadBuffer,
  art: Art,
  world: World,
  player: Entity,
  view: View,
  alpha: number,
  pixel: number,
): void {
  const from = interpolatedPosition(world, player, alpha);
  if (!from) return;
  const quest = currentQuest(world, from);
  const questAt =
    quest === undefined ? undefined : interpolatedPosition(world, quest, alpha);
  if (quest === undefined || !questAt) return;
  const pointer = questPointer(
    worldToScreen(view, questAt),
    { w: view.width, h: view.height },
    INSET * pixel,
  );
  if (!pointer) return;

  const cos = Math.cos(pointer.angle);
  const sin = Math.sin(pointer.angle);
  pushArrow(
    out,
    art,
    pointer.x + cos * ARROW_REACH * pixel,
    pointer.y + sin * ARROW_REACH * pixel,
    pointer.angle,
    pixel,
  );

  const portrait = firstFrame(world.components.sprite.get(quest)!.art);
  const health = world.components.health.get(quest);
  const fraction = health ? health.value / health.max : 1;
  const elements: HudElement[] = [
    {
      kind: "box",
      rect: { x: 0, y: 0, w: CARD, h: CARD },
      fill: HUD_COLORS.slot,
      border: HUD_COLORS.hoverBorder,
    },
    ...(portrait
      ? [
          {
            kind: "icon" as const,
            rect: { x: 2, y: 2, w: 8, h: 8 },
            file: portrait,
          },
        ]
      : []),
    {
      kind: "rect",
      rect: { x: 0, y: CARD + BAR_GAP, w: CARD, h: BAR_HEIGHT },
      fill: BAR_BACK,
    },
    {
      kind: "rect",
      rect: {
        x: 0,
        y: CARD + BAR_GAP,
        w: Math.round(CARD * fraction),
        h: BAR_HEIGHT,
      },
      fill: healthColor(fraction),
    },
  ];
  const left = pointer.x / pixel - CARD / 2;
  const top = pointer.y / pixel - CARD / 2;
  pushElements(out, art, elements, left, top, pixel);

  const distance = Math.round(
    Math.hypot(questAt.x - from.x, questAt.y - from.y),
  );
  pushText(
    out,
    art,
    `${distance}m`,
    pointer.x,
    (top + CARD + BAR_GAP + BAR_HEIGHT + 1) * pixel,
    {
      font: "regular",
      pixel: tooltipPixel(pixel),
      tint: DISTANCE_TINT,
      align: "center",
      outline: { color: BLACK },
    },
  );
}

// The arrow art, centered on (x, y) in device pixels, turned to `angle`.
function pushArrow(
  out: QuadBuffer,
  art: Art,
  x: number,
  y: number,
  angle: number,
  pixel: number,
): void {
  const half = (ARROW / 2 + OUTLINE_THICKNESS) * pixel;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corner = (dx: number, dy: number) => [
    x + dx * cos - dy * sin,
    y + dx * sin + dy * cos,
  ];
  const [ax, ay] = corner(-half, -half);
  const [bx, by] = corner(half, -half);
  const [cx, cy] = corner(half, half);
  const [dx, dy] = corner(-half, half);
  out.push(ax, ay, bx, by, cx, cy, dx, dy, regionOf(art, QUEST_ARROW), {
    margin: OUTLINE_THICKNESS,
    outline: { color: BLACK },
  });
}
