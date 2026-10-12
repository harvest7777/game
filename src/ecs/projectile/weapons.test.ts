import { describe, expect, it } from "vitest";
import { testProjectile, testWeapon } from "../../testing/defs";
import { ring, spread, volley, type WeaponDef } from "./weapons";

const right = { x: 1, y: 0 };

function anglesOf(def: WeaponDef, aim = right) {
  return volley(def, aim).map(({ direction: d }) => Math.atan2(d.y, d.x));
}

describe("volley", () => {
  it("fires one projectile along the aim by default", () => {
    const [{ direction }] = volley(testWeapon(), { x: 0, y: -1 });
    expect(direction.x).toBeCloseTo(0);
    expect(direction.y).toBeCloseTo(-1);
  });

  it("turns each projectile its own angle from the aim", () => {
    const straight = testProjectile();
    const angled = testProjectile();
    const weapon = testWeapon({
      fires: [{ projectile: straight }, { projectile: angled, angle: -0.3 }],
    });

    const [first, second] = volley(weapon, right);

    expect(first.fired.projectile).toBe(straight);
    expect(anglesOf(weapon)).toEqual([expect.closeTo(0), expect.closeTo(-0.3)]);
    expect(second.fired.projectile).toBe(angled);
  });

  it("returns unit directions", () => {
    const weapon = testWeapon({ fires: spread(testProjectile(), 10, 0.6) });
    for (const { direction: d } of volley(weapon, right)) {
      expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    }
  });
});

describe("spread", () => {
  it("spreads projectiles arcGap apart, centered on the aim", () => {
    const angles = spread(testProjectile(), 3, 0.2).map((f) => f.angle);
    expect(angles).toEqual([
      expect.closeTo(-0.2),
      expect.closeTo(0),
      expect.closeTo(0.2),
    ]);
  });

  it("puts an even count's middle pair either side of the aim", () => {
    const angles = spread(testProjectile(), 2, 0.2).map((f) => f.angle);
    expect(angles).toEqual([expect.closeTo(-0.1), expect.closeTo(0.1)]);
  });
});

describe("ring", () => {
  it("spaces projectiles evenly around a full circle", () => {
    const angles = ring(testProjectile(), 4).map((f) => f.angle!);
    expect(angles[1] - angles[0]).toBeCloseTo(Math.PI / 2);
    expect(angles).toHaveLength(4);
  });
});
