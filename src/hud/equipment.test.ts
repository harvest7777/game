import { describe, expect, it } from "vitest";
import { addHoldings } from "../ecs/inventory/bundle";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import type { HudElement } from "./elements";
import {
  equipmentPanel,
  equipmentView,
  SLOT_LABELS,
  SLOT_ORDER,
  type EquipmentView,
} from "./equipment";

const empty: EquipmentView = {
  weapon: null,
  ability: null,
  armor: null,
  ring: null,
};
const lance = {
  id: "lance" as const,
  name: "Piercing Lance",
  sprite: "item.lance",
};

function ofKind<K extends HudElement["kind"]>(
  elements: HudElement[],
  kind: K,
): Extract<HudElement, { kind: K }>[] {
  return elements.filter(
    (e): e is Extract<HudElement, { kind: K }> => e.kind === kind,
  );
}

describe("equipmentView", () => {
  it("shows what's worn in each slot by name and icon", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { weapon: "lance" });

    expect(equipmentView(world, player)).toEqual({ ...empty, weapon: lance });
  });

  it("is undefined for something without equipment", () => {
    const world = createWorld(createTiles(1, 1));
    expect(equipmentView(world, spawn(world))).toBeUndefined();
  });
});

describe("equipmentPanel", () => {
  it("has a slot for each kind, left to right: weapon, ability, armor, ring", () => {
    const { elements } = equipmentPanel(empty);
    const slots = ofKind(elements, "slot");
    expect(slots.map((s) => s.ref)).toEqual(
      SLOT_ORDER.map((slot) => ({ in: "equipment", slot })),
    );
    const xs = slots.map((s) => s.rect.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("fits every slot inside the panel", () => {
    const { w, h, elements } = equipmentPanel(empty);
    for (const { rect } of ofKind(elements, "slot")) {
      expect(rect.x).toBeGreaterThan(0);
      expect(rect.y).toBeGreaterThan(0);
      expect(rect.x + rect.w).toBeLessThan(w);
      expect(rect.y + rect.h).toBeLessThan(h);
    }
  });

  it("shows a worn item's icon inside its slot", () => {
    const { elements } = equipmentPanel({ ...empty, weapon: lance });
    const [weaponSlot] = ofKind(elements, "slot");
    const [icon] = ofKind(elements, "icon");
    expect(icon.sprite).toBe("item.lance");
    expect(icon.rect).toEqual({
      x: weaponSlot.rect.x + 1,
      y: weaponSlot.rect.y + 1,
      w: 8,
      h: 8,
    });
  });

  it("shows a dim letter in each empty slot", () => {
    const { elements } = equipmentPanel({ ...empty, weapon: lance });
    expect(ofKind(elements, "text").map((t) => t.text)).toEqual([
      SLOT_LABELS.ability,
      SLOT_LABELS.armor,
      SLOT_LABELS.ring,
    ]);
  });

  it("draws the panel frame first, under everything", () => {
    const { w, h, elements } = equipmentPanel(empty);
    expect(elements[0]).toMatchObject({
      kind: "box",
      rect: { x: 0, y: 0, w, h },
    });
  });
});
