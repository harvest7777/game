import { describe, expect, it } from "vitest";
import type { Vec2 } from "../shared/physics/math";
import type { ProjectileDef } from "./definitions";
import { pathOffset, pathPoint, trackDistance } from "./path";

function def(changes: Partial<ProjectileDef>): ProjectileDef {
  return {
    speed: 10,
    damage: [10, 10],
    lifetime: 2,
    hitbox: { r: 0.1 },
    sprite: { art: { kind: "static", file: "orb" } },
    sound: {
      hitPlayer: "hitPlayer",
      hitEnemy: "hitEnemy",
    },
    ...changes,
  };
}

function expectPoint(actual: Vec2, x: number, y: number) {
  expect(actual.x, "x").toBeCloseTo(x);
  expect(actual.y, "y").toBeCloseTo(y);
}

describe("trackDistance", () => {
  it("is speed × time without acceleration", () => {
    expect(trackDistance(def({ speed: 10 }), 0.5)).toBeCloseTo(5);
  });

  it("speeds up until maxSpeed, then holds", () => {
    // 2 → 20 tiles/s at 40 tiles/s² takes 0.45 s and covers 4.95 tiles;
    // the remaining 0.55 s at 20 covers 11 more.
    const accelerating = def({ speed: 2, acceleration: 40, maxSpeed: 20 });
    expect(trackDistance(accelerating, 0.45)).toBeCloseTo(4.95);
    expect(trackDistance(accelerating, 1)).toBeCloseTo(15.95);
  });

  it("slows until minSpeed, then holds", () => {
    // 14 → 1 tiles/s at -20 tiles/s² takes 0.65 s and covers 4.875 tiles.
    const slowing = def({ speed: 14, acceleration: -20, minSpeed: 1 });
    expect(trackDistance(slowing, 0.65)).toBeCloseTo(4.875);
    expect(trackDistance(slowing, 2)).toBeCloseTo(4.875 + 1.35);
  });

  it("can turn back when minSpeed is negative", () => {
    // 5 → -5 tiles/s at -10 tiles/s²: out 1.25 tiles, back by t = 1.
    const reversing = def({ speed: 5, acceleration: -10, minSpeed: -5 });
    expect(trackDistance(reversing, 0.5)).toBeCloseTo(1.25);
    expect(trackDistance(reversing, 1)).toBeCloseTo(0);
  });

  it("keeps changing speed without a bound", () => {
    expect(trackDistance(def({ speed: 0, acceleration: 2 }), 3)).toBeCloseTo(9);
  });
});

describe("pathOffset", () => {
  it("goes straight forward by default", () => {
    expectPoint(pathOffset(def({ speed: 10 }), 0.3), 3, 0);
  });

  describe("wave", () => {
    const wavy = def({ speed: 10, wave: { amplitude: 0.5, frequency: 2 } });

    it("starts on the track", () => {
      expectPoint(pathOffset(wavy, 0), 0, 0);
    });

    it("swings to the right first, by the amplitude, a quarter wave in", () => {
      // A full wave takes 0.5 s, so a quarter is 0.125 s.
      expectPoint(pathOffset(wavy, 0.125), 1.25, 0.5);
    });

    it("crosses back over the track every half wave", () => {
      expectPoint(pathOffset(wavy, 0.25), 2.5, 0);
      expectPoint(pathOffset(wavy, 0.375), 3.75, -0.5);
    });

    it("starts partway through when given a phase", () => {
      const shifted = def({
        wave: { amplitude: 0.5, frequency: 2, phase: Math.PI / 2 },
      });
      expectPoint(pathOffset(shifted, 0), 0, 0.5);
    });
  });

  describe("turning", () => {
    // π rad/s at 6 tiles/s: a half circle each second, radius 6/π.
    const spiral = def({ speed: 6, turnRate: Math.PI });
    const radius = 6 / Math.PI;

    it("curves to the right for a positive turn rate", () => {
      expect(pathOffset(spiral, 0.1).y).toBeGreaterThan(0);
    });

    it("is across the circle after half a turn", () => {
      expectPoint(pathOffset(spiral, 1), 0, 2 * radius);
    });

    it("is back where it started after a full turn", () => {
      expectPoint(pathOffset(spiral, 2), 0, 0);
    });

    it("weaves across the curve, not across the firing direction", () => {
      // A quarter turn in (0.5 s) the track points +y, so "to its right" is
      // -x. The wave is a quarter of the way through, at its peak.
      const weaving = def({
        speed: 6,
        turnRate: Math.PI,
        wave: { amplitude: 0.5, frequency: 0.5 },
      });
      expectPoint(pathOffset(weaving, 0.5), radius - 0.5, radius);
    });

    it("keeps the same curve when it speeds up, just covers it faster", () => {
      const faster = def({
        speed: 6,
        turnRate: Math.PI,
        acceleration: 6,
        maxSpeed: 12,
      });
      // Distance 6 is half the circle either way. Covered distance is
      // 6t + 3t², which reaches 6 at t = √3 - 1.
      const t = Math.sqrt(3) - 1;
      expectPoint(pathOffset(faster, t), 0, 2 * radius);
    });
  });

  describe("boomerang", () => {
    const boomerang = def({ speed: 10, lifetime: 1.2, boomerang: true });

    it("is farthest out at half its lifetime", () => {
      expectPoint(pathOffset(boomerang, 0.6), 6, 0);
    });

    it("comes back the way it went", () => {
      const out = pathOffset(boomerang, 0.3);
      const back = pathOffset(boomerang, 0.9);
      expectPoint(back, out.x, out.y);
    });

    it("is back where it was fired at the end of its life", () => {
      expectPoint(pathOffset(boomerang, 1.2), 0, 0);
    });

    it("retraces a wave too", () => {
      const wavy = def({
        lifetime: 1,
        boomerang: true,
        wave: { amplitude: 0.5, frequency: 3 },
      });
      const out = pathOffset(wavy, 0.2);
      expectPoint(pathOffset(wavy, 0.8), out.x, out.y);
    });
  });
});

describe("pathPoint", () => {
  const wavy = def({ speed: 10, wave: { amplitude: 0.5, frequency: 2 } });
  const origin = { x: 5, y: 5 };

  it("goes along the firing direction from the origin", () => {
    expectPoint(pathPoint(def({}), origin, { x: 0, y: -1 }, 0.3), 5, 2);
  });

  it("puts the right of travel clockwise on screen", () => {
    // Fired right (+x): a quarter wave in it's 0.5 below (+y).
    expectPoint(pathPoint(wavy, origin, { x: 1, y: 0 }, 0.125), 6.25, 5.5);
    // Fired down (+y): right of travel is screen-left (-x).
    expectPoint(pathPoint(wavy, origin, { x: 0, y: 1 }, 0.125), 4.5, 6.25);
  });
});
