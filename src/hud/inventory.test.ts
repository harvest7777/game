import { describe, expect, it } from "vitest";
import { addHoldings } from "../ecs/inventory/bundle";
import { createTiles } from "../ecs/tiles";
import { createWorld, spawn } from "../ecs/world";
import { HUD_COLORS, type HudElement } from "./elements";
import { inventoryPanel, inventoryView } from "./inventory";
import { SLOT } from "./layout";

const slotsOf = (elements: HudElement[]) =>
  elements.filter((e) => e.kind === "slot");

describe("inventoryView", () => {
  it("shows each slot's item in order", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    addHoldings(world, player, { carrying: ["lance", "boomerang"] });

    const view = inventoryView(world, player)!;

    expect(view).toHaveLength(8);
    expect(view.slice(0, 3)).toEqual([
      { id: "lance", name: "Piercing Lance", sprite: "item.lance" },
      {
        id: "boomerang",
        name: "Wanderer's Boomerang",
        sprite: "item.boomerang",
      },
      null,
    ]);
  });
});

describe("inventoryPanel", () => {
  const view = Array.from({ length: 8 }, () => null);

  it("lays the 8 slots out four to a row, in order", () => {
    const slots = slotsOf(inventoryPanel(view).elements);
    expect(slots).toHaveLength(8);
    expect(slots.map((s) => (s.kind === "slot" ? s.ref : null))).toEqual(
      view.map((_, index) => ({ in: "inventory", index })),
    );
    const [first, , , fourth, fifth] = slots;
    expect(fourth.rect.y).toBe(first.rect.y);
    expect(fifth.rect.x).toBe(first.rect.x);
    expect(fifth.rect.y).toBeGreaterThan(first.rect.y + SLOT - 1);
  });

  it("numbers empty slots by the key that equips them", () => {
    const labels = inventoryPanel(view)
      .elements.filter(
        (e) => e.kind === "text" && e.tint === HUD_COLORS.dimLabel,
      )
      .map((e) => (e.kind === "text" ? e.text : ""));
    expect(labels).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("has no title, just the slot numbers", () => {
    const texts = inventoryPanel(view).elements.filter(
      (e) => e.kind === "text",
    );
    expect(texts).toHaveLength(8);
  });
});
