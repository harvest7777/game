import { describe, expect, it } from "vitest";
import type { Vec2 } from "../shared/physics/math";
import {
  freshMemory,
  steer,
  type Behavior,
  type SteerContext,
} from "./behaviors";

const DT = 0.05;
const SPEED = 3;

function ctx(changes: Partial<SteerContext> = {}): SteerContext {
  return {
    at: { x: 10, y: 10 },
    origin: { x: 10, y: 10 },
    speed: SPEED,
    dt: DT,
    random: () => 0.5,
    ...changes,
  };
}

// Runs a behavior for `ticks` ticks with nothing in the way, returning every
// position it passed through.
function simulate(
  behavior: Behavior,
  start: Partial<SteerContext>,
  ticks: number,
): Vec2[] {
  const memory = freshMemory();
  const c = ctx(start);
  let at = { ...c.at };
  const path = [at];
  for (let i = 0; i < ticks; i++) {
    const v = steer(behavior, memory, { ...c, at });
    at = { x: at.x + v.x * DT, y: at.y + v.y * DT };
    path.push(at);
  }
  return path;
}

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const speedOf = (v: Vec2) => Math.hypot(v.x, v.y);

describe("stationary", () => {
  it("doesn't move", () => {
    expect(
      steer(
        { kind: "stationary" },
        freshMemory(),
        ctx({ target: { x: 0, y: 0 } }),
      ),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("chase", () => {
  const chase: Behavior = { kind: "chase", stopAt: 2 };

  it("heads straight for the target at full speed", () => {
    const v = steer(chase, freshMemory(), ctx({ target: { x: 20, y: 10 } }));
    expect(v).toEqual({ x: SPEED, y: 0 });
  });

  it("stops at its distance without overshooting", () => {
    const target = { x: 15, y: 10 };
    const path = simulate(chase, { target }, 60);
    const end = path[path.length - 1];
    expect(distance(end, target)).toBeCloseTo(2, 5);
    expect(Math.min(...path.map((p) => distance(p, target)))).toBeCloseTo(2, 5);
  });

  it("stands still without a target", () => {
    expect(steer(chase, freshMemory(), ctx())).toEqual({ x: 0, y: 0 });
  });
});

describe("returnHome", () => {
  it("walks back to its origin and stays", () => {
    const origin = { x: 10, y: 10 };
    const path = simulate(
      { kind: "returnHome" },
      { at: { x: 14, y: 13 }, origin },
      60,
    );
    const end = path[path.length - 1];
    expect(end.x).toBeCloseTo(10, 5);
    expect(end.y).toBeCloseTo(10, 5);
  });
});

describe("orbit", () => {
  const target = { x: 10, y: 10 };

  it("moves around the target when on its ring", () => {
    const v = steer(
      { kind: "orbit", radius: 3 },
      freshMemory(),
      ctx({ at: { x: 13, y: 10 }, target }),
    );
    // Right of the target, clockwise on screen is straight down (+y).
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(SPEED);
  });

  it("goes the other way when not clockwise", () => {
    const v = steer(
      { kind: "orbit", radius: 3, clockwise: false },
      freshMemory(),
      ctx({ at: { x: 13, y: 10 }, target }),
    );
    expect(v.y).toBeCloseTo(-SPEED);
  });

  it("closes in from outside the ring and backs off from inside it", () => {
    const outside = steer(
      { kind: "orbit", radius: 3 },
      freshMemory(),
      ctx({ at: { x: 19, y: 10 }, target }),
    );
    expect(outside.x).toBeLessThan(0);
    const inside = steer(
      { kind: "orbit", radius: 3 },
      freshMemory(),
      ctx({ at: { x: 11, y: 10 }, target }),
    );
    expect(inside.x).toBeGreaterThan(0);
  });

  it("settles onto the ring and goes round it", () => {
    const path = simulate(
      { kind: "orbit", radius: 3 },
      { at: { x: 18, y: 10 }, target },
      200,
    );
    for (const p of path.slice(-60)) {
      expect(distance(p, target)).toBeGreaterThan(2.5);
      expect(distance(p, target)).toBeLessThan(3.5);
    }
  });
});

describe("wander", () => {
  const wander: Behavior = { kind: "wander", radius: 3 };

  it("never strays further than its radius from its origin", () => {
    let seed = 1;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const origin = { x: 10, y: 10 };
    const path = simulate(wander, { origin, random }, 2000);
    for (const p of path)
      expect(distance(p, origin)).toBeLessThanOrEqual(3 + 1e-6);
    // And it actually goes places.
    expect(Math.max(...path.map((p) => distance(p, origin)))).toBeGreaterThan(
      1,
    );
  });

  it("strolls at half speed by default", () => {
    const memory = freshMemory();
    // random 0.5 puts the waypoint half a turn round, sqrt(0.5) × 3 out.
    const v = steer(wander, memory, ctx());
    expect(speedOf(v)).toBeCloseTo(SPEED / 2);
  });

  it("pauses when it reaches a waypoint, then picks another", () => {
    const memory = freshMemory();
    memory.waypoint = { x: 10, y: 10 };
    const first = steer(wander, memory, ctx());
    expect(first).toEqual({ x: 0, y: 0 });
    expect(memory.pause).toBeGreaterThan(0);

    // Wait out the pause (at most 1.5 s).
    let v = first;
    for (let i = 0; i < 40 && speedOf(v) === 0; i++)
      v = steer(wander, memory, ctx());
    expect(speedOf(v)).toBeGreaterThan(0);
  });

  it("gives up on a waypoint it can't reach", () => {
    const memory = freshMemory();
    memory.waypoint = { x: 12, y: 10 };
    // Stuck in place (a wall), so it never arrives.
    for (let i = 0; i < 4 / DT + 2; i++) steer(wander, memory, ctx());
    expect(memory.pause).toBeGreaterThan(0);
  });
});

describe("charge", () => {
  const charge: Behavior = {
    kind: "charge",
    windup: 0.5,
    duration: 0.3,
    speedScale: 4,
    rest: 1,
  };

  // Steps until the charge reaches `stage`, returning how long that took.
  function until(
    stage: string,
    memory: ReturnType<typeof freshMemory>,
    c: SteerContext,
  ): number {
    let elapsed = 0;
    while (memory.stage !== stage && elapsed < 10) {
      steer(charge, memory, c);
      elapsed += DT;
    }
    return elapsed;
  }

  it("winds up, dashes, rests, and does it again", () => {
    const memory = freshMemory();
    const c = ctx({ target: { x: 20, y: 10 } });

    expect(speedOf(steer(charge, memory, c))).toBe(0);
    expect(until("dash", memory, c)).toBeCloseTo(0.5, 1);
    expect(speedOf(steer(charge, memory, c))).toBeCloseTo(4 * SPEED);
    expect(until("rest", memory, c)).toBeCloseTo(0.3, 1);
    expect(speedOf(steer(charge, memory, c))).toBe(0);
    expect(until("windup", memory, c)).toBeCloseTo(1, 1);
    expect(until("dash", memory, c)).toBeCloseTo(0.5, 1);
  });

  it("dashes where the target was when the windup ended", () => {
    const memory = freshMemory();
    until("dash", memory, ctx({ target: { x: 10, y: 20 } }));
    // The target dodges during the dash; the charge keeps its heading.
    const v = steer(charge, memory, ctx({ target: { x: 20, y: 10 } }));
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(4 * SPEED);
  });
});
