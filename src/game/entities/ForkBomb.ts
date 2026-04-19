import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

// ── ForkBombJr ─────────────────────────────────────────────────────────────
// Ejected on parent death. Not placed in rooms directly.

export class ForkBombJr extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, initialAngle: number) {
    super(scene, x, y, {
      hp:            20,
      speed:         210,
      contactDamage: 10,
      hitboxW:       20,
      hitboxH:       20,
    });
    this.buildVisual(this.visual);
    // Apply ejection velocity
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(initialAngle) * 180,
      Math.sin(initialAngle) * 180,
    );
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const circle = this.scene.add.circle(0, 0, 12, 0xffaa44);
    container.add(circle);
  }

  protected updateAI(
    _time:   number,
    _delta:  number,
    player:  Player,
    _room:   Room,
  ): void {
    const dx  = player.getX() - this.carrier.x;
    const dy  = player.getY() - this.carrier.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(
      (dx / len) * this.speed,
      (dy / len) * this.speed,
    );
    this.state = AIState.Chasing;
  }
}

// ── ForkBomb ───────────────────────────────────────────────────────────────

export class ForkBomb extends Enemy {
  private lastVx = 1; // non-zero default so split has a direction even on first hit
  private lastVy = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            65,
      speed:         130,
      contactDamage: 18,
      hitboxW:       36,
      hitboxH:       36,
    });
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Draw spikes before body so body renders on top
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spike = this.scene.add.triangle(0, 0, 0, -34, -4, -22, 4, -22, 0xff6600);
      spike.setRotation(angle);
      container.add(spike);
    }
    const body = this.scene.add.circle(0, 0, 22, 0xff6600);
    container.add(body);
  }

  override takeDamage(amount: number, knockbackDir?: { x: number; y: number }): void {
    const wasDead = this.isDead();
    super.takeDamage(amount, knockbackDir);
    if (!wasDead && this.isDead()) {
      this.emitSplit();
    }
  }

  private emitSplit(): void {
    const len       = Math.sqrt(this.lastVx * this.lastVx + this.lastVy * this.lastVy) || 1;
    const baseAngle = Math.atan2(this.lastVy / len, this.lastVx / len);
    const DEG30     = Math.PI / 6;

    this.scene.events.emit('enemy:spawnForkBombJr', {
      x:     this.carrier.x,
      y:     this.carrier.y,
      angle: baseAngle + DEG30,
    });
    this.scene.events.emit('enemy:spawnForkBombJr', {
      x:     this.carrier.x,
      y:     this.carrier.y,
      angle: baseAngle - DEG30,
    });
  }

  protected updateAI(
    _time:   number,
    delta:   number,
    player:  Player,
    _room:   Room,
  ): void {
    const dx  = player.getX() - this.carrier.x;
    const dy  = player.getY() - this.carrier.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / len) * this.speed, (dy / len) * this.speed);

    // Track last movement direction for death split
    this.lastVx = body.velocity.x;
    this.lastVy = body.velocity.y;

    // Slow rotation — entire container spins
    this.visual.rotation += 0.001 * delta;

    this.state = AIState.Chasing;
  }
}
