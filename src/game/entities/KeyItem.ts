import Phaser from 'phaser';
import type { KeyTier } from '../Inventory';

const TIER_COLOR: Record<KeyTier, number> = {
  bronze: 0xcd7f32,
  silver: 0xaaaaaa,
  gold:   0xffd700,
};

export class KeyItem {
  private readonly scene: Phaser.Scene;
  private readonly tier: KeyTier;
  private readonly carrier: Phaser.Physics.Arcade.Image;
  private readonly diamond: Phaser.GameObjects.Rectangle;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, tier: KeyTier) {
    this.scene = scene;
    this.tier  = tier;

    // Invisible physics carrier for AABB overlap detection
    this.carrier = scene.physics.add.image(x, y, '__DEFAULT');
    this.carrier.setVisible(false);
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(false);

    // Visual: rotated rectangle gives diamond shape
    this.diamond = scene.add.rectangle(x, y, 14, 14, TIER_COLOR[tier]);
    this.diamond.setRotation(Math.PI / 4);
    this.diamond.setDepth(2);

    // Sine bob: 4px amplitude, 2Hz → period 500ms, half-period 250ms per direction
    scene.tweens.add({
      targets:  this.diamond,
      y:        { from: y - 4, to: y + 4 },
      duration: 250,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  getTier(): KeyTier                               { return this.tier; }
  getPhysicsCarrier(): Phaser.Physics.Arcade.Image { return this.carrier; }
  isCollected(): boolean                           { return this.collected; }

  setVisible(visible: boolean): void {
    if (!this.collected) this.diamond.setVisible(visible);
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    (this.carrier.body as Phaser.Physics.Arcade.Body).setEnable(false);

    this.scene.tweens.add({
      targets:  this.diamond,
      scaleX:   1.8,
      scaleY:   1.8,
      alpha:    0,
      duration: 150,
      ease:     'Quad.easeOut',
      onComplete: () => {
        this.diamond.destroy();
        this.carrier.destroy();
      },
    });
  }

  destroy(): void {
    if (this.collected) return;
    this.diamond.destroy();
    this.carrier.destroy();
  }
}
