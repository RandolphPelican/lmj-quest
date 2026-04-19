import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const ORBIT_RADIUS   = 120;
const MAX_SPEED      = 200;
const SHOOT_INTERVAL = 1800;
const PROJECTILE_DMG = 12;

export class RaceCondition extends Enemy {
  private orbitAngle  = Math.random() * Math.PI * 2; // random start so pairs don't overlap
  private shootTimer  = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            45,
      speed:         MAX_SPEED,
      contactDamage: 8,
      hitboxW:       28,
      hitboxH:       20,
    });
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const body = this.scene.add.rectangle(0, 0, 36, 18, 0x00ffee);
    // Fin triangles at each short end, pointing outward
    const finL = this.scene.add.triangle(0, 0, -22, 0, -15, -6, -15, 6, 0x00ffee);
    const finR = this.scene.add.triangle(0, 0,  22, 0,  15, -6,  15, 6, 0x00ffee);
    container.add([finL, finR, body]);
  }

  protected updateAI(
    _time:  number,
    delta:  number,
    player: Player,
    _room:  Room,
  ): void {
    // Advance orbit angle (~1 full orbit per 3.5 seconds)
    this.orbitAngle += 0.0018 * delta;

    // Desired orbital position around player
    const targetX = player.getX() + Math.cos(this.orbitAngle) * ORBIT_RADIUS;
    const targetY = player.getY() + Math.sin(this.orbitAngle) * ORBIT_RADIUS;

    // Velocity toward target, clamped to MAX_SPEED
    let vx     = (targetX - this.carrier.x) * 4;
    let vy     = (targetY - this.carrier.y) * 4;
    const spd  = Math.sqrt(vx * vx + vy * vy);
    if (spd > MAX_SPEED) {
      vx = (vx / spd) * MAX_SPEED;
      vy = (vy / spd) * MAX_SPEED;
    }
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);

    // Rotate visual to face player
    const dx = player.getX() - this.carrier.x;
    const dy = player.getY() - this.carrier.y;
    this.visual.setRotation(Math.atan2(dy, dx));

    this.state = AIState.Approaching;

    // Fire projectile
    this.shootTimer += delta;
    if (this.shootTimer >= SHOOT_INTERVAL) {
      this.shootTimer = 0;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.scene.events.emit('enemy:spawnProjectile', {
        x:      this.carrier.x,
        y:      this.carrier.y,
        dirX:   dx / len,
        dirY:   dy / len,
        damage: PROJECTILE_DMG,
      });
    }
  }
}
