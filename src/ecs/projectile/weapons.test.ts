import { describe, expect, it } from "vitest";
import { projectileIds } from "./definitions";
import { volley, weaponDef, weaponIds, type WeaponDef } from "./weapons";

const right = { x: 1, y: 0 };

function anglesOf(def: WeaponDef, aim = right) {
  return volley(def, aim).map((d) => Math.atan2(d.y, d.x));
}

describe("volley", () => {
  it("fires one shot along the aim by default", () => {
    const [d] = volley({ projectile: "bolt", rate: 1 }, { x: 0, y: -1 });
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(-1);
  });

  it("spreads shots arcGap apart, centered on the aim", () => {
    const angles = anglesOf({
      projectile: "bolt",
      rate: 1,
      count: 3,
      arcGap: 0.2,
    });
    expect(angles[0]).toBeCloseTo(-0.2);
    expect(angles[1]).toBeCloseTo(0);
    expect(angles[2]).toBeCloseTo(0.2);
  });

  it("puts an even count's middle pair either side of the aim", () => {
    const angles = anglesOf({
      projectile: "bolt",
      rate: 1,
      count: 2,
      arcGap: 0.2,
    });
    expect(angles).toEqual([expect.closeTo(-0.1), expect.closeTo(0.1)]);
  });

  it("returns unit directions", () => {
    for (const d of volley(weaponDef("extremePrejudice"), right)) {
      expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    }
  });
});

describe("weapons", () => {
  it("has a single-shot weapon for every projectile", () => {
    for (const id of projectileIds) {
      expect(weaponIds).toContain(id);
      expect(weaponDef(id as never)).toMatchObject({ projectile: id });
    }
  });

  it("all fire at a positive rate with at least one projectile", () => {
    for (const id of weaponIds) {
      const def = weaponDef(id);
      expect(def.rate, id).toBeGreaterThan(0);
      expect(def.count ?? 1, id).toBeGreaterThanOrEqual(1);
    }
  });
});
