/**
 * Pretend interview question:
 * Design a player class for a 2d top down bullet hell game
 *
 * Requirements:
 * - Can shoot, move, collide with other objects
 * - Must support screen rotation controlos
 * - Must support shift-walking for precise movements
 *
 * ---
 *
 *  Design philosphy:
 *  - Responsible for...
 *    - Manipulating its own state required for controls
 *   
 *  - Not responsible for...
 *    - Knowing what physical controls are (wasd, joystick, etc)
 *    - Collision detection, that seems like a core game mechanic that the player just needs to support
 */

type shape = "square" | "circle";

interface Collidable {
  canPassThrough: boolean;
  sizeTiles: number;
  shape: shape;
}

/**
 * The entity is always the point of focus
 * One can imagine a cardinal grid on the entity at all times
 *
 * "0 degrees" will always mean straight right of the entity, regardless which direction
 * the entity is actually facing
 *
 * Shooting at, lets say 45 degrees, will mean shooting exactly at the diagnoal of the 
 * top right quadrant, regardless which direction the entity is actually facing
 *
 * This quadrant follows the same coordinant changes as a unit circle (0,1) at the top
 *      -
 *      -
 *      -
 * - - - - - -
 *      -
 *      -
 *      -
 */
interface Entity extends Collidable {
  baseSpeedTilesPerSecond: number;
  speedMultiplier: number;
  xPos: number;
  yPos: number;
  rotationDegreesPerSecond: number;
  facingDegrees: number;
  calculateDesiredPos(direction: number, dtSeconds: number): void;
  shoot(direction: number, dtSeconds: number): void;
  rotate(dtSeconds: number): void;
}

class Player implements Entity {
  canPassThrough: boolean = true;
  sizeTiles: number = 1;
  shape: shape = "square";
  baseSpeedTilesPerSecond: number = 1;
  speedMultiplier: number = 1;
  xPos: number = 0;
  yPos: number = 0;
  rotationDegreesPerSecond: number = 15;
  facingDegrees: number = 0;
  calculateDesiredPos(direction: number, dtSeconds: number): void {
    /** No matter what, the player must move a total vector distance of dtSeconds * baseSpeedTilesPerSecond * speedMultiplier.
     *  There are 2 normalizations we have to do. Player axis -> World axis
     *  The player can bge turned off from the world axis by their facingDegrees
     *
     *
     */
    const truePolarAngle: number = direction + this.facingDegrees;
    const magnitude: number = dtSeconds * this.baseSpeedTilesPerSecond * this.baseSpeedTilesPerSecond;
    const deltaX: number = Math.cos(truePolarAngle) * magnitude;
    const deltaY: number = Math.sin(truePolarAngle) * magnitude;


    return;
  }
  shoot(direction: number, dtSeconds: number): void {
    return;
  }
  rotate(tSeconds: number): void {
    return;
  }
}
