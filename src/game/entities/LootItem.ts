import Phaser from 'phaser';
import type { LootDefinition } from '../../shared/loot';

export class LootItem {
  private readonly scene: Phaser.Scene;
  private readonly def: LootDefinition;
  private readonly carrier: Phaser.Physics.Arcade.Image;
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: LootDefinition) {
    this.scene = scene;
    this.def   = def;

    // Invisible physics carrier for AABB overlap detection
    this.carrier = scene.physics.add.image(x, y, '__DEFAULT');
    this.carrier.setVisible(false);
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(false);

    this.circle = scene.add.circle(x, y, 10, def.color);
    this.circle.setDepth(2);

    this.label = scene.add.text(x, y - 20, def.label, {
      fontSize:   '9px',
      fontFamily: 'monospace',
      color:      '#ffffff',
    });
    this.label.setOrigin(0.5, 0.5);
    this.label.setDepth(3);

    // Sine bob: 3px amplitude, 500ms period
    scene.tweens.add({
      targets:  this.circle,
      y:        { from: y - 3, to: y + 3 },
      duration: 250,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  getDef(): LootDefinition                         { return this.def; }
  getPhysicsCarrier(): Phaser.Physics.Arcade.Image { return this.carrier; }
  isCollected(): boolean                           { return this.collected; }

  setVisible(visible: boolean): void {
    if (this.collected) return;
    this.circle.setVisible(visible);
    this.label.setVisible(visible);
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    (this.carrier.body as Phaser.Physics.Arcade.Body).setEnable(false);
    this.label.destroy();
    this.scene.tweens.add({
      targets:  this.circle,
      scaleX:   1.8,
      scaleY:   1.8,
      alpha:    0,
      duration: 150,
      ease:     'Quad.easeOut',
      onComplete: () => {
        this.circle.destroy();
        this.carrier.destroy();
      },
    });
  }

  destroy(): void {
    if (this.collected) return;
    this.circle.destroy();
    this.label.destroy();
    this.carrier.destroy();
  }
}
