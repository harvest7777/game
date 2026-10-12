import { describe, expect, it } from "vitest";
import { stageVelocity } from "./stageMovement";

describe("stageVelocity", () => {
  it("leaves a phase movement to the phase's behavior", () => {
    expect(stageVelocity({ kind: "phase" }, { speed: 2 })).toBeUndefined();
  });

  it("holds a stationary boss still", () => {
    expect(stageVelocity({ kind: "stationary" }, { speed: 2 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("dashes along the locked heading at a multiple of its speed", () => {
    const dash = { kind: "dash", speedScale: 4 } as const;
    expect(stageVelocity(dash, { speed: 2, heading: { x: 0, y: -1 } })).toEqual(
      { x: 0, y: -8 },
    );
  });
});
