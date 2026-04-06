import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

export class NullPointer extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp: 60,
      speed: 90,
      contactDamage: 10,
      hitboxW: 24,
      hitboxH: 24,
    });
    this.buildVisual(this.visual);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const diamond = this.scene.add.rectangle(0, 0, 22, 22, 0xdd2222);
    diamond.setRotation(Math.PI / 4);
    const dot = this.scene.add.circle(0, 0, 4, 0xffffff);
    container.add([diamond, dot]);

    this.scene.tweens.add({
      targets: dot,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  protected updateAI(
    _time: number,
    _delta: number,
    player: Player,
    _room: Room,
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
