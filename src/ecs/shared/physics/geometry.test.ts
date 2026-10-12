import { describe, expect, it } from "vitest";
import {
  penetrationCircleCircle,
  penetrationRectCircle,
  sweptCircleCircle,
  sweptRectCircle,
} from "./geometry";
import type { Circle, Rect, Vec2 } from "./math";

type Body<S> = { shape: S; at: Vec2; moving: Vec2 };

const still: Vec2 = { x: 0, y: 0 };

function sweepCircles(a: Body<Circle>, b: Body<Circle>): number {
  return sweptCircleCircle(a.shape, a.moving, a.at, b.shape, b.moving, b.at);
}

function sweepRectCircle(rect: Body<Rect>, circle: Body<Circle>): number {
  return sweptRectCircle(
    rect.shape,
    rect.moving,
    rect.at,
    circle.shape,
    circle.moving,
    circle.at,
  );
}

describe("sweptCircleCircle", () => {
  const unit: Circle = { r: 1 };
  const origin: Body<Circle> = {
    shape: unit,
    at: { x: 0, y: 0 },
    moving: still,
  };

  describe("touches when the gap closes", () => {
    it("when one circle moves head-on into a stationary one", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: { x: 1, y: 0 } };
      // Gap between surfaces is 5 - 2 = 3, closed at 1 tile/s.
      expect(sweepCircles(a, origin)).toBeCloseTo(3);
    });

    it("when both circles move toward each other", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: { x: 1, y: 0 } };
      const b = { shape: unit, at: { x: 5, y: 0 }, moving: { x: -1, y: 0 } };
      // Gap is 10 - 2 = 8, closed at 2 tiles/s.
      expect(sweepCircles(a, b)).toBeCloseTo(4);
    });
  });

  describe("never touches", () => {
    it("when moving away", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: { x: -1, y: 0 } };
      expect(sweepCircles(a, origin)).toBe(Infinity);
    });

    it("when passing on a parallel line farther than the combined radius", () => {
      const a = { shape: unit, at: { x: -5, y: 3 }, moving: { x: 1, y: 0 } };
      expect(sweepCircles(a, origin)).toBe(Infinity);
    });

    it("when both are stationary and apart", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: still };
      expect(sweepCircles(a, origin)).toBe(Infinity);
    });

    it("when both move with the same velocity", () => {
      const v = { x: 2, y: 1 };
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: v };
      const b = { shape: unit, at: { x: 0, y: 0 }, moving: v };
      expect(sweepCircles(a, b)).toBe(Infinity);
    });
  });

  describe("touches immediately", () => {
    it("when already overlapping", () => {
      const a = { shape: unit, at: { x: 1, y: 0 }, moving: still };
      expect(sweepCircles(a, origin)).toBe(0);
    });
  });
});

describe("sweptRectCircle", () => {
  // 2x2 rect centered on the origin, so its faces are at ±1.
  const box: Body<Rect> = {
    shape: { w: 2, h: 2 },
    at: { x: 0, y: 0 },
    moving: still,
  };
  const unit: Circle = { r: 1 };

  describe("touches a face", () => {
    it("when the circle moves into a stationary rect", () => {
      const c = { shape: unit, at: { x: 5, y: 0 }, moving: { x: -1, y: 0 } };
      // Circle center reaches x = 1 + 1 = 2 after 3s.
      expect(sweepRectCircle(box, c)).toBeCloseTo(3);
    });

    it("when the rect moves into a stationary circle", () => {
      const movingBox = { ...box, moving: { x: 1, y: 0 } };
      const c = { shape: unit, at: { x: 5, y: 0 }, moving: still };
      expect(sweepRectCircle(movingBox, c)).toBeCloseTo(3);
    });
  });

  describe("touches the rounded corner, not the inflated box", () => {
    it("when moving diagonally into a corner", () => {
      const c = { shape: unit, at: { x: 5, y: 5 }, moving: { x: -1, y: -1 } };
      // Contact when the center is 1 from corner (1, 1) along the diagonal.
      expect(sweepRectCircle(box, c)).toBeCloseTo(4 - Math.SQRT1_2);
    });

    it("when grazing a corner", () => {
      const c = { shape: unit, at: { x: 5, y: 1.9 }, moving: { x: -1, y: 0 } };
      // Center hits the unit circle around (1, 1) at x = 1 + sqrt(1 - 0.9²).
      expect(sweepRectCircle(box, c)).toBeCloseTo(4 - Math.sqrt(1 - 0.81));
    });
  });

  describe("never touches", () => {
    it("when entering the inflated box corner but missing the rounded corner", () => {
      const c = { shape: unit, at: { x: 5, y: 2.1 }, moving: { x: -1, y: 0 } };
      expect(sweepRectCircle(box, c)).toBe(Infinity);
    });

    it("when moving away from a face", () => {
      const c = { shape: unit, at: { x: 5, y: 0 }, moving: { x: 1, y: 0 } };
      expect(sweepRectCircle(box, c)).toBe(Infinity);
    });
  });

  describe("touches immediately", () => {
    it("when already overlapping", () => {
      const c = { shape: unit, at: { x: 1.5, y: 0 }, moving: still };
      expect(sweepRectCircle(box, c)).toBe(0);
    });
  });
});

describe("penetrationCircleCircle", () => {
  const unit: Circle = { r: 1 };
  const origin: Vec2 = { x: 0, y: 0 };

  it("is null when the circles are apart", () => {
    expect(penetrationCircleCircle(unit, { x: 3, y: 0 }, unit, origin)).toBe(
      null,
    );
  });

  it("pushes A away from B by the overlap", () => {
    // Centers 1.5 apart with combined radius 2, so 0.5 of overlap.
    const pen = penetrationCircleCircle(unit, { x: 0, y: 1.5 }, unit, origin);
    expect(pen?.depth).toBeCloseTo(0.5);
    expect(pen?.normal).toEqual({ x: 0, y: 1 });
  });

  it("pushes concentric circles along +x", () => {
    const pen = penetrationCircleCircle(unit, origin, unit, origin);
    expect(pen?.depth).toBeCloseTo(2);
    expect(pen?.normal).toEqual({ x: 1, y: 0 });
  });
});

describe("penetrationRectCircle", () => {
  // 2x2 rect centered on the origin, so its faces are at ±1.
  const rect: Rect = { w: 2, h: 2 };
  const origin: Vec2 = { x: 0, y: 0 };
  const half: Circle = { r: 0.5 };

  it("is null when the circle is clear of the rect", () => {
    expect(penetrationRectCircle(rect, origin, half, { x: 2, y: 0 })).toBe(
      null,
    );
  });

  it("pushes out of a face along its normal", () => {
    // Center 1.25 from the origin is 0.25 from the face; radius 0.5.
    const pen = penetrationRectCircle(rect, origin, half, { x: -1.25, y: 0 });
    expect(pen?.depth).toBeCloseTo(0.25);
    expect(pen?.normal).toEqual({ x: -1, y: 0 });
  });

  it("pushes away from a corner diagonally", () => {
    const d = 0.2;
    const pen = penetrationRectCircle(rect, origin, half, {
      x: 1 + d,
      y: 1 + d,
    });
    expect(pen?.depth).toBeCloseTo(0.5 - Math.hypot(d, d));
    expect(pen?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(pen?.normal.y).toBeCloseTo(Math.SQRT1_2);
  });

  it("pushes a center inside the rect out through the nearest face", () => {
    // Center is 0.2 from the top face, so it must travel 0.2 + r.
    const pen = penetrationRectCircle(rect, origin, half, { x: 0.1, y: 0.8 });
    expect(pen?.depth).toBeCloseTo(0.7);
    expect(pen?.normal).toEqual({ x: 0, y: 1 });
  });
});
