import { describe, expect, it } from "vitest";
import { lerpAngle } from "./angle";

describe("lerpAngle", () => {
  it("goes straight between nearby angles", () => {
    expect(lerpAngle(1, 2, 0)).toBeCloseTo(1);
    expect(lerpAngle(1, 2, 0.25)).toBeCloseTo(1.25);
    expect(lerpAngle(1, 2, 1)).toBeCloseTo(2);
  });

  it("turns the short way across 0", () => {
    const halfway = lerpAngle(2 * Math.PI - 0.1, 0.1, 0.5);
    expect(Math.cos(halfway)).toBeCloseTo(1);
    expect(Math.sin(halfway)).toBeCloseTo(0);
  });

  it("turns the short way backwards", () => {
    // From 0.1 to -0.3 (written as 2π - 0.3) is 0.4 rad counterclockwise.
    const quarter = lerpAngle(0.1, 2 * Math.PI - 0.3, 0.25);
    expect(Math.sin(quarter)).toBeCloseTo(Math.sin(0));
    expect(Math.cos(quarter)).toBeCloseTo(1);
  });
});
