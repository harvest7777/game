import { portalAt } from "../ecs/portal/spawn";
import type { Color } from "../ecs/sprite/components";
import type { Entity, World } from "../ecs/world";
import type { Art } from "../render/art";
import type { QuadBuffer } from "../render/quads";
import { pushText } from "../render/textLayout";
import { tooltipPixel } from "./draw";
import { HUD_COLORS } from "./elements";

// What the prompt says while the player stands on a portal: where it goes,
// and how to go.
export type PortalPrompt = { label: string; hint: string };

// The prompt for the portal the player could enter right now, if any.
export function portalPrompt(
  world: World,
  player: Entity,
): PortalPrompt | undefined {
  const at = world.components.position.get(player);
  if (!at || !world.components.character.has(player)) return undefined;
  const portal = portalAt(world, at);
  if (portal === undefined) return undefined;
  const { label } = world.components.portal.get(portal)!.def;
  return { label, hint: "press Enter" };
}

// How far up the screen the prompt sits, as a share of its height: over
// the middle of the lower half, clear of the player and the HUD.
const PROMPT_HEIGHT = 0.68;
// Rows of font pixels between the label and the hint.
const LINE_GAP = 10;
const BLACK: Color = [0, 0, 0, 1];
const HINT: Color = [1, 1, 1, 1];

// Draws the prompt centered across a `width` x `height` screen, in device
// pixels, at half the HUD's `pixel` scale like tooltips.
export function pushPortalPrompt(
  out: QuadBuffer,
  art: Art,
  world: World,
  player: Entity,
  width: number,
  height: number,
  pixel: number,
): void {
  const prompt = portalPrompt(world, player);
  if (!prompt) return;
  const textPixel = tooltipPixel(pixel);
  const style = {
    font: "regular" as const,
    pixel: textPixel,
    align: "center" as const,
    outline: { color: BLACK },
  };
  const y = height * PROMPT_HEIGHT;
  pushText(out, art, prompt.label, width / 2, y, {
    ...style,
    tint: HUD_COLORS.title,
  });
  pushText(out, art, prompt.hint, width / 2, y + LINE_GAP * textPixel, {
    ...style,
    tint: HINT,
  });
}
