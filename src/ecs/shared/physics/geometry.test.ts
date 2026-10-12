import { describe, expect, it } from "vitest";
import {
  penetrationCircleCircle,
  penetrationRectCircle,
  sweptCircleCircle,
  sweptRectCircle,
  type Contact,
} from "./geometry";
import type { Circle, Rect, Vec2 } from "./math";

type Body<S> = { shape: S; at: Vec2; moving: Vec2 };

const still: Vec2 = { x: 0, y: 0 };

function sweepCircles(a: Body<Circle>, b: Body<Circle>): Contact | null {
  return sweptCircleCircle(a.shape, a.moving, a.at, b.shape, b.moving, b.at);
}

function sweepRectCircle(
  rect: Body<Rect>,
  circle: Body<Circle>,
): Contact | null {
  return sweptRectCircle(
    rect.shape,
    rect.moving,
    rect.at,
    circle.shape,
    circle.moving,
    circle.at,
  );
}

function expectNormal(contact: Contact | null, x: number, y: number) {
  expect(contact?.normal.x).toBeCloseTo(x);
  expect(contact?.normal.y).toBeCloseTo(y);
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
      const contact = sweepCircles(a, origin);
      // Gap between surfaces is 5 - 2 = 3, closed at 1 tile/s.
      expect(contact?.t).toBeCloseTo(3);
      expectNormal(contact, -1, 0);
    });

    it("when both circles move toward each other", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: { x: 1, y: 0 } };
      const b = { shape: unit, at: { x: 5, y: 0 }, moving: { x: -1, y: 0 } };
      // Gap is 10 - 2 = 8, closed at 2 tiles/s.
      expect(sweepCircles(a, b)?.t).toBeCloseTo(4);
    });
  });

  describe("never touches", () => {
    it("when moving away", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: { x: -1, y: 0 } };
      expect(sweepCircles(a, origin)).toBe(null);
    });

    it("when passing on a parallel line farther than the combined radius", () => {
      const a = { shape: unit, at: { x: -5, y: 3 }, moving: { x: 1, y: 0 } };
      expect(sweepCircles(a, origin)).toBe(null);
    });

    it("when both are stationary and apart", () => {
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: still };
      expect(sweepCircles(a, origin)).toBe(null);
    });

    it("when both move with the same velocity", () => {
      const v = { x: 2, y: 1 };
      const a = { shape: unit, at: { x: -5, y: 0 }, moving: v };
      const b = { shape: unit, at: { x: 0, y: 0 }, moving: v };
      expect(sweepCircles(a, b)).toBe(null);
    });
  });

  describe("when already overlapping", () => {
    it("touches immediately if moving further in", () => {
      const a = { shape: unit, at: { x: 1, y: 0 }, moving: { x: -1, y: 0 } };
      const contact = sweepCircles(a, origin);
      expect(contact?.t).toBe(0);
      expectNormal(contact, 1, 0);
    });

    it("does not touch if moving away", () => {
      const a = { shape: unit, at: { x: 1, y: 0 }, moving: { x: 1, y: 0 } };
      expect(sweepCircles(a, origin)).toBe(null);
    });

    it("does not touch if stationary", () => {
      const a = { shape: unit, at: { x: 1, y: 0 }, moving: still };
      expect(sweepCircles(a, origin)).toBe(null);
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
      const contact = sweepRectCircle(box, c);
      // Circle center reaches x = 1 + 1 = 2 after 3s.
      expect(contact?.t).toBeCloseTo(3);
      expectNormal(contact, 1, 0);
    });

    it("when the rect moves into a stationary circle", () => {
      const movingBox = { ...box, moving: { x: 1, y: 0 } };
      const c = { shape: unit, at: { x: 5, y: 0 }, moving: still };
      expect(sweepRectCircle(movingBox, c)?.t).toBeCloseTo(3);
    });

    it("on the face it actually enters when moving diagonally", () => {
      // Reaches y = 2 (top of inflated box) at t = 3, while x is only 1.
      const c = { shape: unit, at: { x: -2, y: 5 }, moving: { x: 1, y: -1 } };
      const contact = sweepRectCircle(box, c);
      expect(contact?.t).toBeCloseTo(3);
      expectNormal(contact, 0, 1);
    });
  });

  describe("touches the rounded corner, not the inflated box", () => {
    it("when moving diagonally into a corner", () => {
      const c = { shape: unit, at: { x: 5, y: 5 }, moving: { x: -1, y: -1 } };
      const contact = sweepRectCircle(box, c);
      // Contact when the center is 1 from corner (1, 1) along the diagonal.
      expect(contact?.t).toBeCloseTo(4 - Math.SQRT1_2);
      expectNormal(contact, Math.SQRT1_2, Math.SQRT1_2);
    });

    it("when grazing a corner", () => {
      const c = { shape: unit, at: { x: 5, y: 1.9 }, moving: { x: -1, y: 0 } };
      const contact = sweepRectCircle(box, c);
      // Center hits the unit circle around (1, 1) at x = 1 + sqrt(1 - 0.9²).
      const dx = Math.sqrt(1 - 0.81);
      expect(contact?.t).toBeCloseTo(4 - dx);
      expectNormal(contact, dx, 0.9);
    });

    it("when starting inside the inflated box's corner region", () => {
      const small = { r: 0.5 };
      const c = {
        shape: small,
        at: { x: 1.45, y: 1.45 },
        moving: { x: -1, y: -1 },
      };
      const contact = sweepRectCircle(box, c);
      // Corner distance is 0.45√2; contact when it shrinks to 0.5.
      expect(contact?.t).toBeCloseTo(0.45 - 0.5 * Math.SQRT1_2);
    });
  });

  describe("never touches", () => {
    it("when entering the inflated box corner but missing the rounded corner", () => {
      const c = { shape: unit, at: { x: 5, y: 2.1 }, moving: { x: -1, y: 0 } };
      expect(sweepRectCircle(box, c)).toBe(null);
    });

    it("when moving away from a face", () => {
      const c = { shape: unit, at: { x: 5, y: 0 }, moving: { x: 1, y: 0 } };
      expect(sweepRectCircle(box, c)).toBe(null);
    });

    it("when stationary in the inflated box's corner region", () => {
      const small = { r: 0.5 };
      const c = { shape: small, at: { x: 1.45, y: 1.45 }, moving: still };
      expect(sweepRectCircle(box, c)).toBe(null);
    });
  });

  describe("when already overlapping", () => {
    it("touches immediately if moving further in", () => {
      const c = { shape: unit, at: { x: 1.5, y: 0 }, moving: { x: -1, y: 0 } };
      const contact = sweepRectCircle(box, c);
      expect(contact?.t).toBe(0);
      expectNormal(contact, 1, 0);
    });

    it("does not touch if moving away", () => {
      const c = { shape: unit, at: { x: 1.5, y: 0 }, moving: { x: 1, y: 0 } };
      expect(sweepRectCircle(box, c)).toBe(null);
    });

    it("does not touch if sliding along the face", () => {
      const c = { shape: unit, at: { x: 2, y: 0 }, moving: { x: 0, y: 1 } };
      expect(sweepRectCircle(box, c)).toBe(null);
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
