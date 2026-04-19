import Phaser from 'phaser';
import type { KeyTier } from '../Inventory';

const TIER_COLOR: Record<KeyTier, number> = {
  bronze: 0xcd7f32,
  silver: 0xaaaaaa,
  gold:   0xffd700,
};

function darken(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8)  & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

type ChestState = 'locked' | 'open';

export class Chest {
  private readonly scene: Phaser.Scene;
  private readonly tier: KeyTier;
  private state: ChestState = 'locked';
  private readonly carrier: Phaser.Physics.Arcade.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly lid: Phaser.GameObjects.Rectangle;
  private keyholeDot: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, tier: KeyTier) {
    this.scene = scene;
    this.tier  = tier;

    const bodyColor = TIER_COLOR[tier];
    const lidColor  = darken(bodyColor, 0.8);

    // Physics carrier — acts as wall via collider added in GameScene
    this.carrier = scene.physics.add.image(x, y, '__DEFAULT');
    this.carrier.setVisible(false);
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setSize(40, 40);
    body.setImmovable(true);
    body.setAllowGravity(false);
    body.setCollideWorldBounds(false);

    // Visual container at world position
    this.container = scene.add.container(x, y);
    this.container.setDepth(2);

    // Chest body (lower 24px of the 36px total): center at y=+6
    // Occupies y: -6 to +18 in container space
    const chestBody = scene.add.rectangle(0, 6, 40, 24, bodyColor);
    this.container.add(chestBody);

    // Lid (top 12px): origin at bottom-center so rotation hinges at y=-6
    // Bottom of lid = top of body = y=-6 in container space
    this.lid = scene.add.rectangle(0, -6, 40, 12, lidColor);
    this.lid.setOrigin(0.5, 1.0);
    this.container.add(this.lid);

    // Keyhole dot: 3px radius, dark, centered on the lid face at y=-12
    this.keyholeDot = scene.add.circle(0, -12, 3, 0x111111);
    this.container.add(this.keyholeDot);
  }

  getTier(): KeyTier                               { return this.tier; }
  isOpen(): boolean                                { return this.state === 'open'; }
  getPhysicsCarrier(): Phaser.Physics.Arcade.Image { return this.carrier; }
  getX(): number                                   { return this.carrier.x; }
  getY(): number                                   { return this.carrier.y; }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  open(): void {
    if (this.state === 'open') return;
    this.state = 'open';

    this.keyholeDot.destroy();
    (this.carrier.body as Phaser.Physics.Arcade.Body).setEnable(false);

    // Tilt lid 60° counterclockwise around its bottom edge (the hinge)
    this.scene.tweens.add({
      targets:  this.lid,
      rotation: -Math.PI / 3,
      duration: 150,
      ease:     'Quad.easeOut',
    });
  }

  destroy(): void {
    this.container.destroy();
    this.carrier.destroy();
  }
}
