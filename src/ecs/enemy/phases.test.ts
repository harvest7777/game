import { describe, expect, it } from "vitest";
import { holds, nextPhase, type Phase, type PhaseSituation } from "./phases";

const calm: PhaseSituation = { time: 0, healthFraction: 1 };

describe("holds", () => {
  it("healthBelow: below the fraction, not at it", () => {
    expect(holds({ healthBelow: 0.5 }, { ...calm, healthFraction: 0.49 })).toBe(
      true,
    );
    expect(holds({ healthBelow: 0.5 }, { ...calm, healthFraction: 0.5 })).toBe(
      false,
    );
  });

  it("after: once that long in the phase", () => {
    expect(holds({ after: 3 }, { ...calm, time: 2.9 })).toBe(false);
    expect(holds({ after: 3 }, { ...calm, time: 3 })).toBe(true);
  });

  it("targetWithin: only with a target that close", () => {
    expect(holds({ targetWithin: 4 }, { ...calm, targetDistance: 3 })).toBe(
      true,
    );
    expect(holds({ targetWithin: 4 }, { ...calm, targetDistance: 5 })).toBe(
      false,
    );
    expect(holds({ targetWithin: 4 }, calm)).toBe(false);
  });

  it("targetBeyond: a far target or none at all", () => {
    expect(holds({ targetBeyond: 4 }, { ...calm, targetDistance: 5 })).toBe(
      true,
    );
    expect(holds({ targetBeyond: 4 }, { ...calm, targetDistance: 3 })).toBe(
      false,
    );
    expect(holds({ targetBeyond: 4 }, calm)).toBe(true);
  });
});

describe("nextPhase", () => {
  const phase: Phase = {
    next: [
      { to: "dying", when: { healthBelow: 0.2 } },
      { to: "tired", when: { after: 5 } },
    ],
  };

  it("stays without any transition holding", () => {
    expect(nextPhase(phase, calm)).toBeUndefined();
    expect(nextPhase({}, { ...calm, time: 100 })).toBeUndefined();
  });

  it("takes the first transition that holds", () => {
    expect(nextPhase(phase, { time: 9, healthFraction: 0.1 })).toBe("dying");
    expect(nextPhase(phase, { time: 9, healthFraction: 0.9 })).toBe("tired");
  });
});
