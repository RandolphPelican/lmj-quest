import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const SPEED = 180;

export class BitFlip extends Enemy {
  private trailTimer!: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            35,
      speed:         SPEED,
      contactDamage: 15,
      hitboxW:       20,
      hitboxH:       20,
    });
    this.buildVisual(this.visual);
    this.visual.setDepth(2);

    // Launch at true 45°
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(SPEED, SPEED);

    // Repeating trail effect
    this.trailTimer = scene.time.addEvent({
      delay:         80,
      callback:      this.spawnTrail,
      callbackScope: this,
      loop:          true,
    });
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const diamond = this.scene.add.rectangle(0, 0, 22, 22, 0xff00aa);
    diamond.setRotation(Math.PI / 4);
    const dot = this.scene.add.circle(0, 0, 4, 0xffffff);
    container.add([diamond, dot]);
  }

  private spawnTrail(): void {
    if (this.isDead()) {
      this.trailTimer.destroy();
      return;
    }
    const cx     = this.carrier.x;
    const cy     = this.carrier.y;
    const circle = this.scene.add.circle(cx, cy, 8, 0xff00aa, 0.4);
    circle.setDepth(1);
    this.scene.tweens.add({
      targets:  circle,
      alpha:    0,
      duration: 300,
      ease:     'Linear',
      onComplete: () => circle.destroy(),
    });
  }

  protected updateAI(
    _time:   number,
    _delta:  number,
    _player: Player,
    _room:   Room,
  ): void {
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    let vx = body.velocity.x;
    let vy = body.velocity.y;

    if (body.blocked.left  || body.blocked.right) vx *= -1;
    if (body.blocked.up    || body.blocked.down)  vy *= -1;

    // Clamp to constant speed
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    vx = (vx / len) * SPEED;
    vy = (vy / len) * SPEED;

    body.setVelocity(vx, vy);
    this.state = AIState.Patrolling;
  }
}
