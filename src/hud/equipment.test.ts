import { describe, expect, it } from "vitest";
import { testItem } from "../testing/defs";
import { addHoldings } from "../ecs/inventory/bundle";
import { ITEM_KINDS } from "../ecs/inventory/items";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import { HUD_COLORS, type HudElement } from "./elements";
import { equipmentPanel, equipmentView, type EquipmentView } from "./equipment";
import { KIND_LABELS } from "./items";

const empty: EquipmentView = {
  weapon: null,
  ability: null,
  armor: null,
  ring: null,
};
const LANCE = testItem({ name: "Lance", icon: "items/lance" });
const lance = { name: "Lance", icon: "items/lance" };

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
    addHoldings(world, player, { weapon: LANCE });

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
      ITEM_KINDS.map((slot) => ({ in: "equipment", slot })),
    );
    const xs = slots.map((s) => s.rect.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("spans exactly its slots", () => {
    const { w, h, elements } = equipmentPanel(empty);
    const slots = ofKind(elements, "slot");
    expect(Math.min(...slots.map((s) => s.rect.x))).toBe(0);
    expect(Math.max(...slots.map((s) => s.rect.x + s.rect.w))).toBe(w);
    expect(Math.max(...slots.map((s) => s.rect.y + s.rect.h))).toBe(h);
  });

  it("shows a worn item's icon inside its slot", () => {
    const { elements } = equipmentPanel({ ...empty, weapon: lance });
    const [weaponSlot] = ofKind(elements, "slot");
    const [icon] = ofKind(elements, "icon");
    expect(icon.file).toBe("items/lance");
    // A pixel of room between the icon and the slot's border.
    expect(icon.rect).toEqual({
      x: weaponSlot.rect.x + 2,
      y: weaponSlot.rect.y + 2,
      w: 8,
      h: 8,
    });
  });

  it("shows a dim letter in each empty slot", () => {
    const { elements } = equipmentPanel({ ...empty, weapon: lance });
    const dim = ofKind(elements, "text").filter(
      (t) => t.tint === HUD_COLORS.dimLabel,
    );
    expect(dim.map((t) => t.text)).toEqual([
      KIND_LABELS.ability.letter,
      KIND_LABELS.armor.letter,
      KIND_LABELS.ring.letter,
    ]);
  });

  it("has no title, just the slot letters", () => {
    const texts = ofKind(equipmentPanel(empty).elements, "text").map(
      (t) => t.text,
    );
    expect(texts).toEqual(["W", "S", "A", "R"]);
  });

  it("tags each icon with its slot so it can be dragged", () => {
    const { elements } = equipmentPanel({ ...empty, weapon: lance });
    expect(ofKind(elements, "icon")[0].ref).toEqual({
      in: "equipment",
      slot: "weapon",
    });
  });

  it("draws only the slot squares, nothing behind them", () => {
    const boxes = ofKind(equipmentPanel(empty).elements, "box");
    expect(boxes).toHaveLength(4);
    expect(boxes.every((b) => b.ref !== undefined)).toBe(true);
  });
});
