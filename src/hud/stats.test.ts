import { describe, expect, it } from "vitest";
import { testCharacter, testItem } from "../testing/defs";
import { spawnCharacter } from "../ecs/character/spawn";
import { createTiles } from "../ecs/tiles";
import { createWorld } from "../ecs/world";
import { statsPanel, statsView } from "./stats";

describe("stats HUD", () => {
  it("shows all six attributes and marks capped values", () => {
    const world = createWorld(createTiles(2, 2));
    const player = spawnCharacter(world, testCharacter(), { x: 1, y: 1 });
    const panel = statsPanel(statsView(world, player)!);
    const text = panel.elements
      .filter((element) => element.kind === "text")
      .map((element) => element.text);

    for (const label of ["ATT", "DEF", "SPD", "DEX", "VIT", "WIS"]) {
      expect(text.some((line) => line.startsWith(`${label} `))).toBe(true);
    }
  });

  it("shows equipped bonuses without changing the class cap", () => {
    const ring = testItem({
      kind: "ring",
      weapon: undefined,
      bonuses: { attack: 5 },
    });
    const world = createWorld(createTiles(2, 2));
    const player = spawnCharacter(
      world,
      testCharacter({ startingEquipment: { ring } }),
      { x: 1, y: 1 },
    );
    const panel = statsPanel(statsView(world, player)!);
    const text = panel.elements
      .filter((element) => element.kind === "text")
      .map((element) => element.text);

    expect(text).toContain("ATT 30/75");
  });

  it("sizes its columns so no text runs into the next, by any font", () => {
    const world = createWorld(createTiles(2, 2));
    const player = spawnCharacter(world, testCharacter(), { x: 1, y: 1 });
    // A font 10 pixels a character, then one 3.
    for (const perChar of [10, 3]) {
      const measure = (text: string) => text.length * perChar;
      const panel = statsPanel(statsView(world, player)!, measure);
      const lines = panel.elements.flatMap((element) =>
        element.kind === "text" ? [element] : [],
      );
      const widest = Math.max(...lines.map((line) => measure(line.text)));

      expect(lines[1].x - lines[0].x).toBeGreaterThan(widest);
      // The panel, in its own pixels, holds both columns.
      expect(panel.w * panel.scale!).toBeGreaterThan(lines[1].x + widest);
    }
  });
});
