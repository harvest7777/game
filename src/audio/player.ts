import type { SoundMessage } from "../ecs/outbox";
import type { Vec2 } from "../ecs/shared/physics/math";
import { sounds, type SoundFile, type SoundId } from "./assets";

export const FULL_VOLUME_RADIUS = 2;
export const MAX_AUDIBLE_RADIUS = 18;
export const MAX_VOICES = 32;

export type SoundListener = { at: Vec2; angle: number };
export type SoundMix = { gain: number; pan: number; distance: number };

// Distance attenuation and stereo position in the camera's rotated view.
export function soundMix(at: Vec2, listener: SoundListener): SoundMix {
  const dx = at.x - listener.at.x;
  const dy = at.y - listener.at.y;
  const distance = Math.hypot(dx, dy);
  const fade = Math.max(
    0,
    Math.min(
      1,
      (distance - FULL_VOLUME_RADIUS) /
        (MAX_AUDIBLE_RADIUS - FULL_VOLUME_RADIUS),
    ),
  );
  // A squared fade keeps nearby sounds present and makes the edge gentle.
  const gain = (1 - fade) ** 2;

  // The world's direction along the screen's right edge. Nearby sounds pan
  // less aggressively; distant sounds approach their full directional pan.
  const screenRight = {
    x: Math.cos(listener.angle),
    y: Math.sin(listener.angle),
  };
  const lateral = dx * screenRight.x + dy * screenRight.y;
  const pan = Math.max(-1, Math.min(1, lateral / Math.max(8, distance)));
  return { gain, pan, distance };
}

export type SoundPlayer = {
  resume(): Promise<void>;
  play(messages: readonly SoundMessage[], listener: SoundListener): void;
};

export async function createSoundPlayer(
  context: AudioContext,
  baseUrl: string,
): Promise<SoundPlayer> {
  const buffers = new Map<SoundId, AudioBuffer>();
  const entries = Object.entries(sounds) as [SoundId, SoundFile][];
  await Promise.all(
    entries.map(async ([id, file]) => {
      const response = await fetch(`${baseUrl}sounds/${file}.wav`);
      if (!response.ok) throw new Error(`Could not load sound: ${file}`);
      buffers.set(
        id,
        await context.decodeAudioData(await response.arrayBuffer()),
      );
    }),
  );

  const active = new Set<AudioBufferSourceNode>();
  return {
    async resume() {
      if (context.state === "suspended") await context.resume();
    },
    play(messages, listener) {
      // Drop sounds produced before the first user interaction instead of
      // scheduling a backlog that all starts when the context is unlocked.
      if (context.state !== "running") return;
      const audible = messages
        .map((message) => ({ message, mix: soundMix(message.at, listener) }))
        .filter(({ mix }) => mix.gain > 0)
        .sort((a, b) => a.mix.distance - b.mix.distance);

      for (const { message, mix } of audible) {
        if (active.size >= MAX_VOICES) break;
        const buffer = buffers.get(message.sound);
        if (!buffer) continue;

        const source = context.createBufferSource();
        const gain = context.createGain();
        const panner = context.createStereoPanner();
        source.buffer = buffer;
        gain.gain.value = mix.gain;
        panner.pan.value = mix.pan;
        source.connect(gain).connect(panner).connect(context.destination);
        source.addEventListener("ended", () => active.delete(source), {
          once: true,
        });
        active.add(source);
        source.start();
      }
    },
  };
}
