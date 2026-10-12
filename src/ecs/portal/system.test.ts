import { describe, expect, it } from "vitest";
import { testCharacter, testEnemy } from "../../testing/defs";
import { spawnCharacter } from "../character/spawn";
import { spawnEnemy } from "../enemy/spawn";
import { createTiles, setGround } from "../tiles";
import { createWorld } from "../world";
import type { PortalDef } from "./definitions";
import { spawnPortal } from "./spawn";
import { deathPortalSystem, portalSystem } from "./system";

const HOME: PortalDef = {
  label: "Home",
  to: "nexus",
  sprite: { art: { kind: "static", file: "test/portal" } },
};

function setup(standingAt = { x: 5.5, y: 5 }) {
  const world = createWorld(createTiles(10, 10));
  spawnPortal(world, HOME, { x: 5, y: 5 });
  const hero = spawnCharacter(world, testCharacter(), standingAt);
  const enter = () => {
    world.input.commands = [{ kind: "enterPortal" }];
    portalSystem(world, 0.05);
  };
  return { world, hero, enter };
}

describe("portalSystem", () => {
  it("when the player asks while standing on a portal, asks to travel", () => {
    const { world, hero, enter } = setup();
    enter();
    expect(world.outbox).toEqual([
      { kind: "travel", entity: hero, to: "nexus" },
    ]);
  });

  it("when the player is too far away, does nothing", () => {
    const { world, enter } = setup({ x: 7, y: 5 });
    enter();
    expect(world.outbox).toEqual([]);
  });

  it("without being asked, does nothing", () => {
    const { world } = setup();
    portalSystem(world, 0.05);
    expect(world.outbox).toEqual([]);
  });

  it("when two portals are in reach, takes the nearer", () => {
    const { world, enter } = setup({ x: 5.4, y: 5 });
    spawnPortal(world, { ...HOME, to: "abyss" }, { x: 6, y: 5 });
    enter();
    expect(world.outbox).toMatchObject([{ to: "nexus" }]);
  });
});

describe("deathPortalSystem", () => {
  it("opens the enemy's death portal where it died", () => {
    const world = createWorld(createTiles(10, 10));
    const boss = spawnEnemy(world, testEnemy({ deathPortal: HOME }), {
      x: 3,
      y: 4,
    });
    world.events.deaths.push({ entity: boss });

    deathPortalSystem(world, 0.05);

    const [[portal, { def }]] = [...world.components.portal];
    expect(def).toBe(HOME);
    expect(world.components.position.get(portal)).toEqual({ x: 3, y: 4 });
  });

  it("opens nothing for enemies without one", () => {
    const world = createWorld(createTiles(10, 10));
    const slime = spawnEnemy(world, testEnemy(), { x: 3, y: 4 });
    world.events.deaths.push({ entity: slime });

    deathPortalSystem(world, 0.05);

    expect(world.components.portal.size).toBe(0);
  });
});

describe("deathPortalSystem and lava", () => {
  it("opens the portal on the nearest safe ground, not in lava", () => {
    const floor = { art: "floor" };
    const lava = { art: "lava", hazard: { damage: 10, every: 1 } };
    const tiles = createTiles(10, 10, [floor, lava]);
    setGround(tiles, 3, 4, 1);
    const world = createWorld(tiles);
    const boss = spawnEnemy(world, testEnemy({ deathPortal: HOME }), {
      x: 3.9,
      y: 4.5,
    });
    world.events.deaths.push({ entity: boss });

    deathPortalSystem(world, 0.05);

    const [[portal]] = [...world.components.portal];
    expect(world.components.position.get(portal)).toEqual({ x: 4.5, y: 4.5 });
  });
});
