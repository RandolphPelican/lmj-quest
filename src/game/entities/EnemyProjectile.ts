// EnemyProjectile — straight-line ranged attack projectile.
//
// DESIGN BACKLOG NOTE for future phases:
// This is the base "straight shot" projectile. Future projectile variants
// being designed for Phase 5+:
//   - Bouncing: ricochets off walls N times before dying
//   - Tracking/homing: curves toward player after firing
//   - Piercing: passes through enemies, stops at walls
//   - Wall-piercing (ghost): passes through walls, distance limited
//   - Splitting: at midpoint, splits into 2-3 in a fan
//   - Boomerang: flies forward, returns to caster
//   - Trail: leaves damaging fire/ice/poison trail behind
//   - Status effects on hit: slow, burn DOT, confuse, freeze, stun
//
// Wall interaction will also become configurable per projectile type:
//   - Hard wall: destroys projectile (current default)
//   - Soft wall: projectile passes through (architectural openings)
//   - Bounce wall: projectile reflects
//
// When implementing variants, extend this base class rather than rewriting it.

import Phaser from 'phaser';

const SPEED    = 160;
const LIFETIME = 3000; // ms

export class EnemyProjectile {
  private readonly carrier: Phaser.Physics.Arcade.Image;
  private readonly visual: Phaser.GameObjects.Rectangle;
  private readonly damage: number;
  private alive = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    damage: number,
  ) {
    this.damage  = damage;

    this.carrier = scene.physics.add.image(x, y, '__DEFAULT');
    this.carrier.setVisible(false);
    this.carrier.setDepth(0);
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 12);
    body.setVelocity(dirX * SPEED, dirY * SPEED);

    this.visual = scene.add.rectangle(x, y, 12, 12, 0x44ffff);
    this.visual.setDepth(3);

    scene.time.delayedCall(LIFETIME, () => this.destroy());
  }

  update(): void {
    if (!this.alive) return;
    this.visual.setPosition(this.carrier.x, this.carrier.y);
  }

  setupWallCollision(walls: Phaser.Physics.Arcade.StaticGroup): void {
    this.carrier.scene.physics.add.collider(this.carrier, walls, () => {
      this.destroy();
    });
  }

  isAlive(): boolean { return this.alive; }
  getDamage(): number { return this.damage; }
  getPhysicsCarrier(): Phaser.Physics.Arcade.Image { return this.carrier; }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.carrier.destroy();
    this.visual.destroy();
  }
}
