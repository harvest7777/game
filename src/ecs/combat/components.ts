// Takes hits (they still show as damage numbers) but never loses health.
export type Invulnerable = true;

// Incoming damage is multiplied while an exposed weak point is active.
export type Vulnerable = { multiplier: number };
