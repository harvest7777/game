import type { Vec2 } from "../shared/physics/math";
import type { BossMovement } from "./sequences";

// What a stage's movement can look at.
export type StageMover = {
  speed: number;
  // The aim locked in when the stage began, if it locks one.
  heading?: Vec2;
};

type MoverFor<M extends BossMovement> = (
  movement: M,
  boss: StageMover,
) => Vec2 | undefined;

// Each kind of stage movement's velocity, or undefined to leave moving to the
// phase's behavior. Adding a kind is adding an entry here.
const STAGE_MOVERS: {
  [K in BossMovement["kind"]]: MoverFor<Extract<BossMovement, { kind: K }>>;
} = {
  phase: () => undefined,
  stationary: () => ({ x: 0, y: 0 }),
  dash: ({ speedScale }, { speed, heading = { x: 1, y: 0 } }) => ({
    x: heading.x * speed * speedScale,
    y: heading.y * speed * speedScale,
  }),
};

export function stageVelocity(
  movement: BossMovement,
  boss: StageMover,
): Vec2 | undefined {
  const move = STAGE_MOVERS[movement.kind] as MoverFor<BossMovement>;
  return move(movement, boss);
}
