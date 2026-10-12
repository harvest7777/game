// Takes hits (they still show as damage numbers) but never loses health.
export type Invulnerable = true;

// Incoming damage is multiplied while an exposed weak point is active.
export type Vulnerable = { multiplier: number };

// Seconds since it last took damage (and last tick's, for drawing between
// ticks). Only there for a while after a hit, so its health bar can show
// and then fade.
export type RecentlyHurt = { age: number; previousAge: number };
