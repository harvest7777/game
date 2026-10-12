import { describe, expect, it } from "vitest";
import { testCharacter } from "../testing/defs";
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

  it("leaves a gutter between its two stat columns", () => {
    const world = createWorld(createTiles(2, 2));
    const player = spawnCharacter(world, testCharacter(), { x: 1, y: 1 });
    const panel = statsPanel(statsView(world, player)!);
    const lines = panel.elements.flatMap((element) =>
      element.kind === "text" ? [element] : [],
    );

    expect(lines[1].x - lines[0].x).toBeGreaterThan(50);
  });
});
