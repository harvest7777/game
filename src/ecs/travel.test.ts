import { describe, expect, it } from "vitest";
import { STAT, stat } from "./stats/components";
import { createTiles } from "./tiles";
import { travel } from "./travel";
import { createWorld, spawn } from "./world";

function setup() {
  const from = createWorld(createTiles(4, 4));
  const to = createWorld(createTiles(8, 8));
  // Something already in the new world, so ids differ.
  spawn(to);
  const hero = spawn(from);
  from.components.position.set(hero, { x: 1, y: 1 });
  from.components.previousPosition.set(hero, { x: 0.9, y: 1 });
  from.components.velocity.set(hero, { x: 3, y: 0 });
  from.components[STAT.HEALTH].set(hero, stat(80, 100));
  from.components.team.set(hero, "player");
  return { from, to, hero };
}

describe("travel", () => {
  it("brings everything the entity has into the new world", () => {
    const { from, to, hero } = setup();
    const health = from.components[STAT.HEALTH].get(hero);

    const arrived = travel(from, to, hero, { x: 5, y: 6 });

    expect(to.components[STAT.HEALTH].get(arrived)).toBe(health);
    expect(to.components.team.get(arrived)).toBe("player");
  });

  it("arrives standing still at the given spot", () => {
    const { from, to, hero } = setup();

    const arrived = travel(from, to, hero, { x: 5, y: 6 });

    expect(to.components.position.get(arrived)).toEqual({ x: 5, y: 6 });
    expect(to.components.previousPosition.get(arrived)).toEqual({ x: 5, y: 6 });
    expect(to.components.velocity.get(arrived)).toEqual({ x: 0, y: 0 });
  });

  it("leaves nothing of it in the old world", () => {
    const { from, to, hero } = setup();
    travel(from, to, hero, { x: 5, y: 6 });
    for (const store of Object.values(from.components)) {
      expect(store.has(hero)).toBe(false);
    }
  });

  it("leaves behind what points into the old world", () => {
    const { from, to, hero } = setup();
    const bag = spawn(from);
    from.components.target.set(hero, bag);
    from.components.containerAccess.set(hero, { container: bag });

    const arrived = travel(from, to, hero, { x: 5, y: 6 });

    expect(to.components.target.has(arrived)).toBe(false);
    expect(to.components.containerAccess.has(arrived)).toBe(false);
  });

  it("brings a camera following it along, still following it", () => {
    const { from, to, hero } = setup();
    from.camera.target = hero;
    from.camera.zoom = 2;

    const arrived = travel(from, to, hero, { x: 5, y: 6 });

    expect(to.camera.target).toBe(arrived);
    expect(to.camera.zoom).toBe(2);
  });
});
