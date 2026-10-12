import type { SpriteArt } from "../ecs/sprite/art";
import { characters } from "./characters";
import { enemies } from "./enemies";
import { grounds } from "./grounds";
import { projectiles } from "./projectiles";
import { items } from "./items";

// Every piece of art the game's content shows, each once, for the atlas to
// load.
export function contentArt(): SpriteArt[] {
  const icons: SpriteArt[] = Object.values(items).map((item) => ({
    kind: "static",
    file: item.icon,
  }));
  return [
    ...new Set<SpriteArt>([
      ...Object.values(characters).flatMap((def) => [
        def.sprite.art,
        def.gravestone,
      ]),
      ...Object.values(projectiles).map((def) => def.sprite.art),
      ...Object.values(enemies).map((def) => def.sprite.art),
      ...icons,
      ...Object.values(grounds).map((ground): SpriteArt => ({
        kind: "static",
        file: ground.art,
      })),
    ]),
  ];
}
