import type { SoundMessage } from "../outbox";
import type { World } from "../world";

// How loud the player's own shots are, against everything else.
export const PLAYER_SHOT_VOLUME = 0.5;

// Turns gameplay events into semantic sound requests for the browser. It runs
// before cleanup, while hit and death targets still have their components.
export function soundSystem(world: World, _dt: number): void {
  const sounds: SoundMessage[] = [];

  for (const cue of world.events.soundCues) {
    sounds.push({ kind: "sound", sound: cue.sound, at: { ...cue.at } });
  }

  for (const shot of world.events.shotsFired) {
    if (!shot.weapon.sound) continue;
    const players = world.components.playerControlled.has(shot.owner);
    sounds.push({
      kind: "sound",
      sound: shot.weapon.sound,
      at: shot.at,
      // The player's own shots never stop, so they sit back in the mix.
      ...(players && { volume: PLAYER_SHOT_VOLUME }),
    });
  }

  for (const hit of world.events.hits) {
    const projectile = world.components.projectile.get(hit.projectile);
    const at = world.components.position.get(hit.target);
    if (!projectile || !at) continue;
    const sound = projectile.def.sound;
    sounds.push({
      kind: "sound",
      sound:
        world.components.team.get(hit.target) === "player"
          ? sound.hitPlayer
          : sound.hitEnemy,
      at: { ...at },
    });
  }

  for (const death of world.events.deaths) {
    const enemy = world.components.enemy.get(death.entity);
    const at = world.components.position.get(death.entity);
    if (!enemy || !at) continue;
    sounds.push({
      kind: "sound",
      sound: enemy.def.deathSound,
      at: { ...at },
    });
  }

  world.outbox.push(...sounds);
}
