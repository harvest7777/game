import {
  dungeonIds,
  dungeonRegistries,
  dungeons,
  type DungeonId,
} from "../content/dungeons";
import { enemies, enemyIds, type EnemyId } from "../content/enemies";
import { levels } from "../content/levels";
import { itemIds, items, type ItemId } from "../content/items";
import { spawnCrowd, spawnEnemy } from "../ecs/enemy/spawn";
import type { Command } from "../ecs/input/commands";
import type { LevelDef } from "../ecs/level/definitions";
import { dungeonLevel } from "../ecs/level/dungeon";
import type { Entity, World } from "../ecs/world";
import { createRenderDebug, type RenderDebug } from "../render/debug";

// Weapons every new character is given to try.
const DEBUG_KIT = [
  items.helixStaff,
  items.leafStaff,
  items.forkStaff,
  items.bloomStaff,
];

export type DebugPanel = {
  // Overlays the renderer draws, toggled from the panel.
  renderDebug: RenderDebug;
  // Call when a character spawns: gives it the debug weapons and applies the
  // invulnerable toggle to it.
  characterSpawned(entity: Entity): void;
};

// Wires up the overlay's debug controls: render toggles, invulnerability,
// max stats, pickers that give items and spawn enemies, and a way into any
// dungeon by seed and back to the nexus. `world` and `player` are whatever is
// current right now; `commands` is the queue the next tick reads; `enter`
// swaps to a fresh world for a level.
export function installDebugPanel(
  world: () => World,
  commands: Command[],
  player: () => Entity,
  enter: (level: LevelDef) => void,
): DebugPanel {
  const renderDebug = createRenderDebug();
  checkbox("debugHitboxes", (on) => (renderDebug.hitboxes = on));
  checkbox("debugFont", (on) => (renderDebug.font = on));

  // Off to start with; turn it on for stress tests.
  const invulnerable = checkbox("debugInvulnerable", (on) =>
    setInvulnerable(player(), on),
  );
  button("debugMaxStats", () => commands.push({ kind: "maxStats" }));
  function setInvulnerable(entity: Entity, on: boolean) {
    // A dead player has nothing left to protect.
    const { character, invulnerable } = world().components;
    if (!character.has(entity)) return;
    if (on) invulnerable.set(entity, true);
    else invulnerable.delete(entity);
  }

  // Puts the picked item in the first empty slot.
  const itemPicker = element<HTMLSelectElement>("debugItem");
  for (const id of itemIds) itemPicker.add(new Option(items[id].name, id));
  button("debugGive", () => {
    commands.push({ kind: "give", item: items[itemPicker.value as ItemId] });
  });

  // Puts the picked enemy a few tiles from the player, toward where it's
  // aiming, or a crowd of them around there.
  const enemyPicker = element<HTMLSelectElement>("debugEnemy");
  const enemyCount = element<HTMLInputElement>("debugCount");
  for (const id of enemyIds) enemyPicker.add(new Option(id, id));
  button("debugSpawn", () => {
    const { position, shooter, facing } = world().components;
    const at = position.get(player());
    if (!at) return;
    const aim = shooter.get(player())?.aim ??
      facing.get(player()) ?? { x: 1, y: 0 };
    const center = { x: at.x + aim.x * 4, y: at.y + aim.y * 4 };
    const def = enemies[enemyPicker.value as EnemyId];
    const count = Math.max(1, Math.floor(Number(enemyCount.value) || 1));
    if (count === 1) spawnEnemy(world(), def, center);
    else spawnCrowd(world(), def, center, count);
  });

  // Builds the picked dungeon from the typed seed, or a random one, which
  // then shows as the seed box's hint so it can be built again.
  const dungeonPicker = element<HTMLSelectElement>("debugDungeon");
  const seedInput = element<HTMLInputElement>("debugSeed");
  for (const id of dungeonIds) {
    dungeonPicker.add(new Option(dungeons[id].name, id));
  }
  button("debugEnter", () => {
    const typed = Math.floor(Number(seedInput.value));
    const seed =
      seedInput.value && Number.isFinite(typed)
        ? typed
        : Math.floor(Math.random() * 2 ** 31);
    seedInput.placeholder = String(seed);
    const def = dungeons[dungeonPicker.value as DungeonId];
    enter(dungeonLevel(def, seed, dungeonRegistries));
  });
  button("debugNexus", () => enter(levels.nexus));

  return {
    renderDebug,
    characterSpawned(entity) {
      setInvulnerable(entity, invulnerable.checked);
      for (const item of DEBUG_KIT) commands.push({ kind: "give", item });
    },
  };
}

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// Calls `changed` whenever the box is ticked or unticked. Doesn't keep focus,
// or movement keys like space would toggle it again.
function checkbox(
  id: string,
  changed: (on: boolean) => void,
): HTMLInputElement {
  const box = element<HTMLInputElement>(id);
  box.addEventListener("change", () => {
    changed(box.checked);
    box.blur();
  });
  return box;
}

function button(id: string, clicked: () => void): void {
  element<HTMLButtonElement>(id).addEventListener("click", (event) => {
    clicked();
    (event.currentTarget as HTMLButtonElement).blur();
  });
}
