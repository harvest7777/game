import { describe, expect, it } from "vitest";
import { FULL_VOLUME_RADIUS, MAX_AUDIBLE_RADIUS, soundMix } from "./player";

const listener = { at: { x: 10, y: 10 }, angle: 0 };

describe("soundMix", () => {
  it("is full volume nearby and silent at the audible edge", () => {
    expect(soundMix({ x: 10 + FULL_VOLUME_RADIUS, y: 10 }, listener).gain).toBe(
      1,
    );
    expect(soundMix({ x: 10 + MAX_AUDIBLE_RADIUS, y: 10 }, listener).gain).toBe(
      0,
    );
  });

  it("pans in screen space", () => {
    expect(soundMix({ x: 18, y: 10 }, listener).pan).toBe(1);
    expect(soundMix({ x: 2, y: 10 }, listener).pan).toBe(-1);
  });

  it("turns the stereo field with the camera", () => {
    const turned = { ...listener, angle: Math.PI / 2 };
    expect(soundMix({ x: 10, y: 18 }, turned).pan).toBe(1);
    expect(soundMix({ x: 10, y: 2 }, turned).pan).toBe(-1);
  });
});
