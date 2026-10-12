import { describe, expect, it } from "vitest";
import { ARRIVAL_FADE, fadeDarkness } from "./fade";

describe("fadeDarkness", () => {
  it("is black on arrival and clear once the fade is over", () => {
    expect(fadeDarkness(10, 10)).toBe(1);
    expect(fadeDarkness(10, 10 + ARRIVAL_FADE)).toBeCloseTo(0);
    expect(fadeDarkness(10, 99)).toBe(0);
  });

  it("opens up quickly, more than half clear half way through", () => {
    expect(fadeDarkness(10, 10 + ARRIVAL_FADE / 2)).toBeCloseTo(0.25);
  });
});
