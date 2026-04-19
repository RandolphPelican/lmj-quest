import Phaser from 'phaser';

export class ManaShrine {
  private activated = false;
  private readonly carrier: Phaser.Physics.Arcade.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly core: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Invisible static carrier — player cannot walk through shrine
    this.carrier = scene.physics.add.staticImage(x, y, '__DEFAULT');
    this.carrier.setVisible(false);
    (this.carrier.body as Phaser.Physics.Arcade.StaticBody).setSize(36, 36);
    this.carrier.refreshBody();

    // Compound visual
    const glow = scene.add.circle(0, 0, 22, 0x4444ff, 0.15);
    const base = scene.add.circle(0, 0, 18, 0x1a1a6a);
    const ring = scene.add.circle(0, 0, 12, 0x4444ff);
    this.core  = scene.add.circle(0, 0,  6, 0xaaaaff);

    this.container = scene.add.container(x, y, [glow, base, ring, this.core]);
    this.container.setDepth(2);

    // Pulsing core
    scene.tweens.add({
      targets:  this.core,
      alpha:    { from: 0.5, to: 1.0 },
      duration: 1000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  getX(): number         { return this.carrier.x; }
  getY(): number         { return this.carrier.y; }
  isActivated(): boolean { return this.activated; }
  getCarrier(): Phaser.Physics.Arcade.Image { return this.carrier; }

  activate(): void {
    if (this.activated) return;
    this.activated = true;

    // Flash white, then fade out
    this.core.setFillStyle(0xffffff);
    this.container.scene.tweens.add({
      targets:  this.container,
      alpha:    0,
      duration: 600,
      ease:     'Quad.easeOut',
      onComplete: () => { this.container.setVisible(false); },
    });
    (this.carrier.body as Phaser.Physics.Arcade.StaticBody).enable = false;
  }

  setVisible(visible: boolean): void {
    if (this.activated) return;
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy();
    this.carrier.destroy();
  }
}
