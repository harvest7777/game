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

// A low-pass filter: keeps what's below `cutoff` Hz, three one-pole stages
// deep so noise loses its hiss instead of just dulling a little. Each sound
// makes its own, since it remembers its last samples.
function lowpass(cutoff, stages = 3) {
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE);
  const last = new Array(stages).fill(0);
  return (x) => {
    let y = x;
    for (let i = 0; i < stages; i++) y = last[i] += k * (y - last[i]);
    return y;
  };
}

// Decays from 1 toward 0, `rate` times per second.
function decay(t, rate) {
  return Math.exp(-t * rate);
}

// Sounds stay low, short and soft, and sound like what makes them, rather
// than arcade bleeps: filtered noise for air, fire and impacts, and low
// tones that barely bend in pitch.
const air = lowpass(1300);
const fire = lowpass(900);
const crackle = lowpass(2200);
const string = lowpass(900);
const thud = lowpass(500);
const smack = lowpass(1100);
const fall = lowpass(700);
const rumble = lowpass(220);
const growl = lowpass(300);
const whump = lowpass(400);
const rush = lowpass(700);
const crack = lowpass(1500);
const swirl = lowpass(600);
const gulp = lowpass(800);
const pouch = lowpass(450);

const cues = {
  // A staff's spell leaving it: a soft breath of air with a little body.
  "projectiles/magic-fire": wav(0.12, (t, d) => {
    const breath = air(noise()) * 1.4;
    const body = Math.sin(2 * Math.PI * 150 * t) * 0.18 * decay(t, 35);
    return (breath + body) * envelope(t, d, 0.006) * 0.45;
  }),
  // A bowstring let go: a low pluck and a quick click.
  "projectiles/arrow-fire": wav(0.1, (t, d) => {
    const pluck = Math.sin(2 * Math.PI * 115 * t) * decay(t, 45) * 0.5;
    const click = string(noise()) * decay(t, 90) * 0.5;
    return (pluck + click) * envelope(t, d, 0.002) * 0.5;
  }),
  // Fire thrown: a muffled whoosh with crackles in it.
  "projectiles/fire-cast": wav(0.2, (t, d) => {
    const whoosh = fire(noise()) * Math.sin((Math.PI * t) / d) * 1.8;
    const pops = noise() > 0.93 ? crackle(noise()) * 1.2 : crackle(0);
    return (whoosh + pops * 0.8) * envelope(t, d, 0.01) * 0.5;
  }),
  // Something hitting the player: a dull, heavy thud.
  "projectiles/hit-player": wav(0.13, (t, d) => {
    const body = Math.sin(2 * Math.PI * 75 * t) * decay(t, 30) * 0.6;
    const impact = thud(noise()) * decay(t, 40) * 0.7;
    return (body + impact) * envelope(t, d, 0.002) * 0.6;
  }),
  // A shot landing on an enemy: a short, soft smack.
  "projectiles/hit-enemy": wav(0.08, (t, d) => {
    const impact = smack(noise()) * decay(t, 60) * 1.6;
    const body = Math.sin(2 * Math.PI * 130 * t) * decay(t, 70) * 0.25;
    return (impact + body) * envelope(t, d, 0.002) * 0.45;
  }),
  // An enemy going down: a muffled slump.
  "enemies/death": wav(0.28, (t, d) => {
    const slump = fall(noise()) * decay(t, 14) * 0.6;
    const body = Math.sin(2 * Math.PI * 70 * t) * decay(t, 12) * 0.35;
    return (slump + body) * envelope(t, d, 0.004) * 0.5;
  }),
  // A boss falling: a long, deep rumble.
  "enemies/boss-death": wav(0.9, (t, d) => {
    const ground = rumble(noise()) * 1.4;
    const body = Math.sin(2 * Math.PI * 48 * t) * 0.4;
    return (ground + body) * decay(t, 3.5) * envelope(t, d, 0.01) * 0.6;
  }),
  // A boss gathering itself: a low growl swelling up.
  "enemies/boss-windup": wav(0.42, (t, d) => {
    const swell = t / d;
    const voice = growl(noise()) * 1.2 + Math.sin(2 * Math.PI * 62 * t) * 0.25;
    return voice * swell * envelope(t, d, 0.02) * 0.5;
  }),
  // A boss letting a spell go: a deep whump.
  "enemies/boss-cast": wav(0.22, (t, d) => {
    const body = Math.sin(2 * Math.PI * 72 * t) * decay(t, 16) * 0.6;
    const push = whump(noise()) * decay(t, 25) * 0.7;
    return (body + push) * envelope(t, d, 0.003) * 0.55;
  }),
  // A boss charging: rushing air.
  "enemies/boss-dash": wav(0.32, (t, d) => {
    const wind = rush(noise()) * Math.sin((Math.PI * t) / d) * 2;
    return wind * envelope(t, d, 0.01) * 0.55;
  }),
  // A boss's guard breaking: a dull crack.
  "enemies/boss-expose": wav(0.3, (t, d) => {
    const snap = crack(noise()) * decay(t, 50) * 0.8;
    const body = Math.sin(2 * Math.PI * 95 * t) * decay(t, 14) * 0.35;
    return (snap + body) * envelope(t, d, 0.002) * 0.55;
  }),
  // Going through a portal: a soft swirl of air, rising and falling.
  "world/travel": wav(0.5, (t, d) => {
    const wind = swirl(noise()) * Math.sin((Math.PI * t) / d) ** 2 * 2;
    return wind * envelope(t, d, 0.04) * 0.5;
  }),
  // Drinking a potion: two low gulps.
  "items/drink": wav(0.3, (t, d) => {
    const first = Math.sin(2 * Math.PI * 160 * t) * decay(t, 25);
    const later = t - 0.14;
    const second =
      later > 0 ? Math.sin(2 * Math.PI * 140 * later) * decay(later, 25) : 0;
    const liquid = gulp(noise()) * 0.2;
    return (first * 0.4 + second * 0.4 + liquid) * envelope(t, d, 0.005) * 0.5;
  }),
  // Loot dropping: a soft cha-ching, two coin clinks over the bag landing.
  "items/bag-drop": wav(0.35, (t, d) => {
    const clink = (start, pitch) => {
      const at = t - start;
      if (at < 0) return 0;
      const ring =
        Math.sin(2 * Math.PI * pitch * at) +
        Math.sin(2 * Math.PI * pitch * 2.4 * at) * 0.35;
      return ring * decay(at, 22);
    };
    const coins = clink(0, 880) * 0.22 + clink(0.09, 1180) * 0.2;
    const landing = pouch(noise()) * decay(t, 30) * 1.2;
    return (coins + landing) * envelope(t, d, 0.002) * 0.5;
  }),
};

for (const [name, data] of Object.entries(cues)) {
  const file = new URL(`../public/sounds/${name}.wav`, import.meta.url);
  await mkdir(new URL("./", file), { recursive: true });
  await writeFile(file, data);
}
