import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { opponents, targetsByTeam } from "./teams";

describe("targetsByTeam", () => {
  it("groups targets with health, a team and a position", () => {
    const world = createWorld(createTiles(1, 1));
    const { health, team, position } = world.components;
    const add = (side?: "player" | "enemy", placed = true) => {
      const e = spawn(world);
      health.set(e, { value: 1, max: 1 });
      if (side) team.set(e, side);
      if (placed) position.set(e, { x: 0, y: 0 });
      return e;
    };
    const player = add("player");
    const a = add("enemy");
    const b = add("enemy");
    add(); // no team
    add("enemy", false); // nowhere

    const byTeam = targetsByTeam(world);
    expect(byTeam.get("player")).toEqual([player]);
    expect(byTeam.get("enemy")).toEqual([a, b]);
    expect(opponents(byTeam, "enemy")).toEqual([player]);
    expect(opponents(byTeam, "player")).toEqual([a, b]);
  });
});
