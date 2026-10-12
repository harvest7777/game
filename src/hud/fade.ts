import type { QuadBuffer } from "../render/quads";

// How long arriving somewhere fades in from black, in seconds.
export const ARRIVAL_FADE = 0.35;

const NO_REGION = { x: 0, y: 0, w: 0, h: 0 };

// How dark the screen is `time` seconds in, having arrived at `arrivedAt`:
// fully black on arrival, clear once the fade is over, easing out so it
// opens up quickly and settles.
export function fadeDarkness(arrivedAt: number, time: number): number {
  const progress = (time - arrivedAt) / ARRIVAL_FADE;
  if (progress >= 1) return 0;
  if (progress <= 0) return 1;
  return (1 - progress) ** 2;
}

// A black veil over the whole `width` x `height` screen, `darkness` opaque.
export function pushFade(
  out: QuadBuffer,
  width: number,
  height: number,
  darkness: number,
): void {
  if (darkness <= 0) return;
  out.push(0, 0, width, 0, width, height, 0, height, NO_REGION, {
    outline: { color: [0, 0, 0, darkness] },
    fill: true,
  });
}
