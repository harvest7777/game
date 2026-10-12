import { mkdir, writeFile } from "node:fs/promises";

const SAMPLE_RATE = 22050;

function envelope(t, duration, attack = 0.01) {
  const fadeIn = Math.min(1, t / attack);
  const fadeOut = Math.min(1, (duration - t) / Math.min(0.08, duration / 2));
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function wav(duration, sample) {
  const count = Math.ceil(duration * SAMPLE_RATE);
  const data = Buffer.alloc(44 + count * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + count * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(SAMPLE_RATE, 24);
  data.writeUInt32LE(SAMPLE_RATE * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    const value = Math.max(-1, Math.min(1, sample(t, duration)));
    data.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  return data;
}

let noiseState = 0x5eed;
function noise() {
  noiseState = (noiseState * 1664525 + 1013904223) >>> 0;
  return (noiseState / 0xffffffff) * 2 - 1;
}

const cues = {
  "projectiles/magic-fire": wav(0.12, (t, d) => {
    const frequency = 210 - 45 * (t / d);
    const tone = Math.tanh(2.2 * Math.sin(2 * Math.PI * frequency * t));
    return (tone * 0.25 + noise() * 0.035) * envelope(t, d, 0.003);
  }),
  "projectiles/arrow-fire": wav(0.09, (t, d) => {
    const body = Math.sin(2 * Math.PI * 760 * t) * 0.2;
    return (body + noise() * 0.16) * envelope(t, d, 0.004);
  }),
  "projectiles/hit-player": wav(0.18, (t, d) => {
    const drop = 180 - 70 * (t / d);
    return (
      (Math.sin(2 * Math.PI * drop * t) + noise() * 0.35) *
      envelope(t, d, 0.003) *
      0.38
    );
  }),
  "projectiles/hit-enemy": wav(0.11, (t, d) => {
    return (
      (Math.sin(2 * Math.PI * 260 * t) + noise() * 0.25) *
      envelope(t, d, 0.002) *
      0.3
    );
  }),
  "enemies/death": wav(0.3, (t, d) => {
    const frequency = 300 - 190 * (t / d);
    return (
      (Math.sin(2 * Math.PI * frequency * t) + noise() * 0.12) *
      envelope(t, d) *
      0.35
    );
  }),
  "enemies/boss-death": wav(0.6, (t, d) => {
    const frequency = 220 - 150 * (t / d);
    const tone = Math.sin(2 * Math.PI * frequency * t);
    const low = Math.sin(2 * Math.PI * frequency * 0.5 * t);
    return (tone * 0.6 + low * 0.4 + noise() * 0.1) * envelope(t, d) * 0.42;
  }),
  "enemies/boss-windup": wav(0.42, (t, d) => {
    const frequency = 95 + 95 * (t / d);
    return (
      (Math.sin(2 * Math.PI * frequency * t) * 0.55 + noise() * 0.08) *
      envelope(t, d, 0.015) *
      0.36
    );
  }),
  "enemies/boss-cast": wav(0.22, (t, d) => {
    const frequency = 330 + 210 * (t / d);
    return (
      (Math.sin(2 * Math.PI * frequency * t) + noise() * 0.12) *
      envelope(t, d, 0.004) *
      0.34
    );
  }),
  "enemies/boss-dash": wav(0.34, (t, d) => {
    const frequency = 130 - 70 * (t / d);
    return (
      (Math.sin(2 * Math.PI * frequency * t) * 0.4 + noise() * 0.5) *
      envelope(t, d, 0.008) *
      0.35
    );
  }),
  "enemies/boss-expose": wav(0.45, (t, d) => {
    const frequency = 180 + 420 * (t / d);
    return (
      (Math.sin(2 * Math.PI * frequency * t) * 0.6 +
        Math.sin(2 * Math.PI * frequency * 0.5 * t) * 0.3) *
      envelope(t, d, 0.01) *
      0.38
    );
  }),
};

for (const [name, data] of Object.entries(cues)) {
  const file = new URL(`../public/sounds/${name}.wav`, import.meta.url);
  await mkdir(new URL("./", file), { recursive: true });
  await writeFile(file, data);
}
