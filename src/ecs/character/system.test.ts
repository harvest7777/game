import { describe, expect, it } from "vitest";
import { testCharacter } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { spawnCharacter } from "./spawn";
import { gravestoneSystem } from "./system";

function setup() {
  const world = createWorld(createTiles(20, 20));
  const def = testCharacter();
  const player = spawnCharacter(world, def, { x: 5, y: 6 });
  return { world, def, player };
}

// Everything drawn on the ground layer.
function graves(world: ReturnType<typeof setup>["world"]) {
  return [...world.components.sprite]
    .filter(([, sprite]) => sprite.layer === "ground")
    .map(([entity, sprite]) => ({
      entity,
      sprite,
      at: world.components.position.get(entity),
    }));
}

describe("gravestoneSystem", () => {
  it("leaves the character's gravestone where it died", () => {
    const { world, def, player } = setup();
    world.events.deaths.push({ entity: player });

    gravestoneSystem(world, 0.05);

    const [grave] = graves(world);
    expect(grave.at).toEqual({ x: 5, y: 6 });
    expect(grave.sprite).toEqual({ art: def.gravestone, layer: "ground" });
    expect(world.components.hitbox.has(grave.entity)).toBe(false);
    expect(world.components.health.has(grave.entity)).toBe(false);
  });

  it("keeps a camera that followed the character on its gravestone", () => {
    const { world, player } = setup();
    world.camera.target = player;
    world.events.deaths.push({ entity: player });

    gravestoneSystem(world, 0.05);

    const [grave] = graves(world);
    expect(world.camera.target).toBe(grave.entity);
  });

  it("leaves nothing for deaths that aren't characters", () => {
    const { world } = setup();
    const slime = spawn(world);
    world.components.position.set(slime, { x: 1, y: 1 });
    world.events.deaths.push({ entity: slime });

    gravestoneSystem(world, 0.05);

    expect(graves(world)).toEqual([]);
  });
});
