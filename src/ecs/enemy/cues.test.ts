import { describe, expect, it } from "vitest";
import { testEnemy } from "../../testing/defs";
import { createTiles, setWall } from "../tiles";
import { createWorld } from "../world";
import { playCue } from "./cues";
import { spawnEnemy } from "./spawn";

function setup() {
  const world = createWorld(createTiles(20, 20), () => 0);
  const boss = spawnEnemy(world, testEnemy(), { x: 10, y: 10 });
  const minion = testEnemy();
  const source = {
    entity: boss,
    at: { x: 10, y: 10 },
    aim: () => ({ x: 1, y: 0 }),
  };
  const summoned = () =>
    [...world.components.enemy].filter(([, e]) => e.def === minion);
  return { world, boss, minion, source, summoned };
}

describe("summon", () => {
  it("calls `count` in evenly around the boss, `radius` out", () => {
    const { world, minion, source, summoned } = setup();

    playCue(
      world,
      { kind: "summon", enemy: minion, count: 4, radius: 3 },
      source,
    );

    // Random is 0, so the first lands due east and the rest a quarter turn on.
    const spots = summoned().map(([id]) => world.components.position.get(id)!);
    const rounded = spots.map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
    }));
    expect(rounded).toEqual([
      { x: 13, y: 10 },
      { x: 10, y: 13 },
      { x: 7, y: 10 },
      { x: 10, y: 7 },
    ]);
  });

  it("records who summoned them", () => {
    const { world, boss, minion, source, summoned } = setup();
    playCue(
      world,
      { kind: "summon", enemy: minion, count: 2, radius: 3 },
      source,
    );
    for (const [, enemy] of summoned()) expect(enemy.summoner).toBe(boss);
  });

  it("never lets more than `max` of its summons be alive", () => {
    const { world, minion, source, summoned } = setup();
    const cue = {
      kind: "summon",
      enemy: minion,
      count: 3,
      radius: 3,
      max: 4,
    } as const;

    playCue(world, cue, source);
    playCue(world, cue, source);

    expect(summoned()).toHaveLength(4);
  });

  it("pulls a summon in rather than putting it through a wall", () => {
    const { world, minion, source, summoned } = setup();
    // A wall two tiles east, with open floor past it where random 0 would
    // put the only summon.
    for (let y = 0; y < 20; y++) setWall(world.tiles, 12, y);

    playCue(
      world,
      { kind: "summon", enemy: minion, count: 1, radius: 3 },
      source,
    );

    // A third of the way out is the furthest it can see.
    const [[id]] = summoned();
    expect(world.components.position.get(id)).toEqual({ x: 11, y: 10 });
  });

  it("when nowhere along the line is clear, puts the summon on the boss", () => {
    const { world, minion, source, summoned } = setup();
    setWall(world.tiles, 11, 10);

    playCue(
      world,
      { kind: "summon", enemy: minion, count: 1, radius: 3 },
      source,
    );

    const [[id]] = summoned();
    expect(world.components.position.get(id)).toEqual({ x: 10, y: 10 });
  });
});
