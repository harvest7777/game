import { describe, expect, it } from "vitest";
import { ring } from "../ecs/projectile/weapons";
import type { ItemDef } from "../ecs/inventory/items";
import type { ProjectileDef } from "../ecs/projectile/definitions";
import {
  testConsumable,
  testItem,
  testProjectile,
  testWeapon,
} from "../testing/defs";
import {
  itemTooltip,
  placeTooltip,
  range,
  tooltipPanel,
  TOOLTIP_COLORS,
} from "./tooltip";

const texts = (item: ItemDef) => itemTooltip(item).map((l) => l.text);

// A staff whose shot has `shot`'s traits.
const firing = (shot: Partial<ProjectileDef>) =>
  testItem({
    weapon: testWeapon({ fires: [{ projectile: testProjectile(shot) }] }),
  });

describe("itemTooltip", () => {
  it("names the item and its kind first", () => {
    const [name, kind] = itemTooltip(testItem({ name: "Staff" }));
    expect(name).toEqual({ text: "Staff", color: TOOLTIP_COLORS.name });
    expect(kind.text).toBe("Weapon");
  });

  it("labels a consumable without treating it as equipment", () => {
    // The test consumable heals 50.
    expect(texts(testConsumable({ name: "Potion" }))).toEqual([
      "Potion",
      "Consumable",
      "Restores 50 HP",
    ]);
  });

  it("lists equipment bonuses before weapon details", () => {
    const ring = testItem({
      name: "Ring",
      kind: "ring",
      weapon: undefined,
      bonuses: { health: 40, attack: 2, vitality: 3 },
    });
    expect(texts(ring)).toEqual([
      "Ring",
      "Ring",
      "+40 Max HP",
      "+2 Attack",
      "+3 Vitality",
    ]);
  });

  it("gives a weapon's damage, rate and range from its definitions", () => {
    const staff = testItem({
      name: "Staff",
      weapon: testWeapon({
        rate: 4,
        fires: [
          {
            projectile: testProjectile({
              damage: [20, 30],
              speed: 12,
              lifetime: 0.6,
            }),
          },
        ],
      }),
    });
    // 12 tiles/s for 0.6 s.
    expect(texts(staff)).toEqual([
      "Staff",
      "Weapon",
      "Damage: 20-30",
      "Rate: 4/s",
      "Range: 7.2 tiles",
    ]);
  });

  it("counts the projectiles in a shot", () => {
    const shard = testProjectile({ damage: [25, 40] });
    const tenRing = testItem({
      weapon: testWeapon({ fires: ring(shard, 10) }),
    });
    expect(texts(tenRing)).toContain("Damage: 25-40 x10");
  });

  it("lists each kind of projectile in a mixed shot, and the farthest range", () => {
    const straight = testProjectile({ damage: [30, 40], lifetime: 1 });
    const short = testProjectile({ damage: [10, 20], lifetime: 0.5 });
    const trident = testItem({
      weapon: testWeapon({
        fires: [
          { projectile: short, angle: -0.3 },
          { projectile: straight },
          { projectile: short, angle: 0.3 },
        ],
      }),
    });
    // 10 tiles/s for 1 s at the farthest.
    expect(texts(trident)).toEqual(
      expect.arrayContaining(["Damage: 10-20 x2, 30-40", "Range: 10 tiles"]),
    );
  });

  it("lists what's special about its shots", () => {
    expect(texts(firing({ pierces: true }))).toContain("Pierces enemies");
    expect(texts(firing({ walls: "pass" }))).toContain("Passes through walls");
    expect(texts(firing({ boomerang: true }))).toContain("Returns");
    expect(texts(firing({ wave: { amplitude: 1, frequency: 1 } }))).toContain(
      "Weaves",
    );
    expect(texts(firing({ acceleration: 5 }))).toContain("Speeds up");
    expect(texts(firing({ acceleration: -5 }))).toContain("Slows down");
  });
});

describe("range", () => {
  it("is speed times lifetime for a straight shot", () => {
    const shot = testProjectile({ speed: 12, lifetime: 0.6 });
    expect(range(shot)).toBeCloseTo(12 * 0.6, 1);
  });

  it("is the turnaround point for a boomerang, not where it ends", () => {
    const shot = testProjectile({ speed: 10, lifetime: 1.2, boomerang: true });
    // 10 tiles/s out for half of 1.2 s.
    expect(range(shot)).toBeCloseTo(6, 1);
  });

  it("follows a curving path", () => {
    // A spiral never gets farther than the circle it traces: 2 radii.
    const spiral = testProjectile({ speed: 6, turnRate: Math.PI });
    const radius = spiral.speed / spiral.turnRate!;
    expect(range(spiral)).toBeLessThanOrEqual(2 * radius + 1e-6);
  });
});

describe("tooltipPanel", () => {
  it("fits its widest line with a margin", () => {
    const panel = tooltipPanel(
      [
        { text: "abc", color: TOOLTIP_COLORS.stat },
        { text: "abcdef", color: TOOLTIP_COLORS.stat },
      ],
      (text) => text.length * 4,
    );
    expect(panel.w).toBe(24 + 6);
    const lines = panel.elements.filter((e) => e.kind === "text");
    expect(lines).toHaveLength(2);
  });
});

describe("placeTooltip", () => {
  const size = { w: 40, h: 20 };
  const screen = { w: 200, h: 120 };

  it("goes up and to the right of the pointer", () => {
    expect(placeTooltip(size, { x: 50, y: 60 }, screen)).toEqual({
      x: 54,
      y: 36,
    });
  });

  it("flips left near the right edge and below near the top", () => {
    expect(placeTooltip(size, { x: 190, y: 10 }, screen)).toEqual({
      x: 146,
      y: 14,
    });
  });
});

describe("itemTooltip for consumables", () => {
  it("says what using it does", () => {
    const potion = testConsumable({
      name: "Health Potion",
      use: { kind: "heal", amount: 100 },
    });
    expect(itemTooltip(potion).map((line) => line.text)).toEqual([
      "Health Potion",
      "Consumable",
      "Restores 100 HP",
    ]);
  });
});
