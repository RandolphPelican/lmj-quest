import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const FLEE_RADIUS     = 160; // px — flee if closer than this
const APPROACH_RADIUS = 240; // px — approach if farther than this
const SHOOT_INTERVAL  = 1800; // ms
const PROJECTILE_DMG  = 20;

export class InfiniteLoop extends Enemy {
  private orb!: Phaser.GameObjects.Arc;
  private orbitAngle = 0;
  private shootTimer = SHOOT_INTERVAL;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp: 80,
      speed: 40,
      contactDamage: 5,
      hitboxW: 28,
      hitboxH: 28,
    });
    this.buildVisual(this.visual);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const main = this.scene.add.circle(0, 0, 16, 0x11bbcc);
    this.orb   = this.scene.add.circle(18, 0, 8, 0x44ddee);
    container.add([main, this.orb]);
  }

  protected updateAI(
    _time: number,
    delta: number,
    player: Player,
    _room: Room,
  ): void {
    // Orbit animation
    this.orbitAngle += delta * 0.003;
    this.orb.setPosition(
      Math.cos(this.orbitAngle) * 20,
      Math.sin(this.orbitAngle) * 20,
    );

    const dx   = player.getX() - this.carrier.x;
    const dy   = player.getY() - this.carrier.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;

    if (dist < FLEE_RADIUS) {
      this.state = AIState.Fleeing;
      const len = dist || 1;
      body.setVelocity((-dx / len) * this.speed, (-dy / len) * this.speed);
    } else if (dist > APPROACH_RADIUS) {
      this.state = AIState.Approaching;
      const len = dist || 1;
      body.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);
    } else {
      this.state = AIState.Idle;
      body.setVelocity(0, 0);
    }

    // Fire projectile
    this.shootTimer -= delta;
    if (this.shootTimer <= 0) {
      this.shootTimer = SHOOT_INTERVAL;
      const len = dist || 1;
      this.scene.events.emit('enemy:spawnProjectile', {
        x: this.carrier.x,
        y: this.carrier.y,
        dirX: dx / len,
        dirY: dy / len,
        damage: PROJECTILE_DMG,
      });
    }
  }
}
