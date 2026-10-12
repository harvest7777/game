import { describe, expect, it } from "vitest";
import {
  FULL_VOLUME_RADIUS,
  MAX_AUDIBLE_RADIUS,
  mergeSounds,
  soundMix,
} from "./player";

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

describe("mergeSounds", () => {
  const at = (x: number, y: number) => ({ x, y });

  it("plays a crowd's same sound in one spot as one", () => {
    const casts = Array.from({ length: 1000 }, () => ({
      kind: "sound" as const,
      sound: "bossCast" as const,
      at: at(10.2, 10.7),
    }));
    expect(mergeSounds(casts)).toHaveLength(1);
  });

  it("keeps different sounds, and the same sound far apart", () => {
    const merged = mergeSounds([
      { kind: "sound", sound: "bossCast", at: at(10, 10) },
      { kind: "sound", sound: "hitEnemy", at: at(10, 10) },
      { kind: "sound", sound: "bossCast", at: at(30, 10) },
    ]);
    expect(merged).toHaveLength(3);
  });

  it("keeps the loudest volume of those it merges", () => {
    const [merged] = mergeSounds([
      { kind: "sound", sound: "magicFire", at: at(5, 5), volume: 0.5 },
      { kind: "sound", sound: "magicFire", at: at(5.5, 5) },
    ]);
    expect(merged.volume).toBeUndefined();
  });
});
