import { describe, expect, it } from "vitest";
import { testWeapon } from "../../testing/defs";
import { volley, type WeaponDef } from "./weapons";

const right = { x: 1, y: 0 };

function anglesOf(def: WeaponDef, aim = right) {
  return volley(def, aim).map((d) => Math.atan2(d.y, d.x));
}

describe("volley", () => {
  it("fires one shot along the aim by default", () => {
    const [d] = volley(testWeapon(), { x: 0, y: -1 });
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(-1);
  });

  it("spreads shots arcGap apart, centered on the aim", () => {
    const angles = anglesOf(testWeapon({ count: 3, arcGap: 0.2 }));
    expect(angles[0]).toBeCloseTo(-0.2);
    expect(angles[1]).toBeCloseTo(0);
    expect(angles[2]).toBeCloseTo(0.2);
  });

  it("puts an even count's middle pair either side of the aim", () => {
    const angles = anglesOf(testWeapon({ count: 2, arcGap: 0.2 }));
    expect(angles).toEqual([expect.closeTo(-0.1), expect.closeTo(0.1)]);
  });

  it("returns unit directions", () => {
    for (const d of volley(testWeapon({ count: 10, arcGap: 0.6 }), right)) {
      expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    }
  });
});
