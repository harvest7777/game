import { describe, expect, it } from "vitest";
import { testCharacter } from "../testing/defs";
import { spawnCharacter } from "../ecs/character/spawn";
import { spawnPortal } from "../ecs/portal/spawn";
import { createTiles } from "../ecs/tiles";
import { createWorld } from "../ecs/world";
import { portalPrompt } from "./portalPrompt";

const ABYSS = {
  label: "Abyss of Demons",
  to: "abyss",
  sprite: { art: { kind: "static" as const, file: "portal" } },
};

function standingAt(at: { x: number; y: number }) {
  const world = createWorld(createTiles(10, 10));
  spawnPortal(world, ABYSS, { x: 5, y: 5 });
  const player = spawnCharacter(world, testCharacter(), at);
  return { world, player };
}

describe("portalPrompt", () => {
  it("names the portal the player's standing on and how to enter", () => {
    const { world, player } = standingAt({ x: 5.4, y: 5 });
    expect(portalPrompt(world, player)).toEqual({
      label: "Abyss of Demons",
      hint: "press Enter",
    });
  });

  it("says nothing away from portals", () => {
    const { world, player } = standingAt({ x: 8, y: 8 });
    expect(portalPrompt(world, player)).toBeUndefined();
  });
});
