import { describe, expect, it } from "vitest";
import { BLACK_OUTLINE, type Outline } from "../ecs/sprite/components";
import { characters } from "./characters";
import { enemies } from "./enemies";
import { lootBags } from "./loot/bags";
import { portals } from "./portals";
import { projectiles } from "./projectiles";

// Every outline in the game, by what wears it.
const outlines: (readonly [string, Outline | undefined])[] = [
  ...Object.entries(enemies).map(
    ([id, d]) => [`enemy ${id}`, d.sprite.outline] as const,
  ),
  ...Object.entries(projectiles).map(
    ([id, d]) => [`projectile ${id}`, d.sprite.outline] as const,
  ),
  ...Object.entries(portals).map(
    ([id, d]) => [`portal ${id}`, d.sprite.outline] as const,
  ),
  ...Object.entries(characters).map(
    ([id, d]) => [`character ${id}`, d.sprite.outline] as const,
  ),
  ...lootBags.map((bag) => [`bag ${bag.name}`, bag.outline] as const),
];

describe("outlines", () => {
  for (const [what, outline] of outlines) {
    it(`${what} is outlined plain black, with no glow`, () => {
      expect(outline).toEqual(BLACK_OUTLINE);
    });
  }
});
