import { describe, expect, it } from "vitest";
import { outboxSystem } from "./outbox";
import { runTick } from "./tick";
import { createTiles } from "./tiles";
import { createWorld, spawn } from "./world";

describe("outboxSystem", () => {
  it("passes item moves on to the outside world", () => {
    const world = createWorld(createTiles(1, 1));
    const player = spawn(world);
    world.events.itemsMoved.push({
      entity: player,
      to: { in: "inventory", index: 2 },
    });

    outboxSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "itemMoved", entity: player, to: { in: "inventory", index: 2 } },
    ]);
  });

  it("keeps messages across ticks until they're drained", () => {
    const world = createWorld(createTiles(1, 1));
    world.outbox.push({
      kind: "itemMoved",
      entity: 0,
      to: { in: "inventory", index: 0 },
    });

    runTick(world, 0.05);
    runTick(world, 0.05);

    expect(world.outbox).toHaveLength(1);
  });
});
