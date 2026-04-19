import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

export class Deadlock extends Enemy {
  private beam!: Phaser.GameObjects.Rectangle;
  private beamAngle = 0;
  private beamCooldown = 0; // ms remaining until next tick is allowed

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            60,
      speed:         0,
      contactDamage: 0,
      hitboxW:       44,
      hitboxH:       44,
    });
    this.buildVisual(this.visual);
    this.visual.setDepth(2);

    // Simulate static body: dynamic carrier that never gets pushed
    (this.carrier.body as Phaser.Physics.Arcade.Body).setImmovable(true);
  }

  getBeamAngle(): number { return this.beamAngle; }

  tickBeamDamage(player: Player): void {
    if (this.beamCooldown > 0) return;
    this.beamCooldown = 500;
    player.takeDamage(8);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Hexagon body (circle approximation)
    const hex = this.scene.add.circle(0, 0, 20, 0x333366);
    hex.setStrokeStyle(2, 0x6666aa);

    // Rotating beam — origin at left edge so it pivots at body center
    this.beam = this.scene.add.rectangle(0, 0, 80, 6, 0x9999ff);
    this.beam.setOrigin(0, 0.5);
    this.beam.setAlpha(0.7);

    // Inner core with pulse tween
    const core = this.scene.add.circle(0, 0, 8, 0x9999ff);
    this.scene.tweens.add({
      targets:  core,
      alpha:    { from: 0.6, to: 1.0 },
      duration: 800,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // Add in order: hex behind, beam next, core on top
    container.add([hex, this.beam, core]);
  }

  protected updateAI(
    _time:   number,
    delta:   number,
    _player: Player,
    _room:   Room,
  ): void {
    // Never moves
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // Rotate beam at 90°/second
    this.beamAngle += (Math.PI / 2) * (delta / 1000);
    this.beam.setRotation(this.beamAngle);

    // Tick down damage cooldown
    if (this.beamCooldown > 0) {
      this.beamCooldown = Math.max(0, this.beamCooldown - delta);
    }

    this.state = AIState.Idle;
  }
}
