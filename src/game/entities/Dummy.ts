import Phaser from 'phaser';

export class Dummy {
  private readonly scene: Phaser.Scene;
  private readonly onDeath: () => void;

  private readonly carrier: Phaser.Physics.Arcade.Image;
  private readonly visual: Phaser.GameObjects.Container;

  private hp = 50;
  private isDeadFlag = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onDeath: () => void,
  ) {
    this.scene = scene;
    this.onDeath = onDeath;

    // Invisible dynamic physics carrier
    this.carrier = scene.physics.add.image(x, y, '__DEFAULT');
    this.carrier.setVisible(false);
    this.carrier.setDepth(0);
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setSize(32, 32);
    body.setCollideWorldBounds(false);

    // Visual compound shape — GossipGPT doodle
    this.visual = scene.add.container(x, y);
    this.visual.setDepth(1);
    this.buildVisual();
  }

  private buildVisual(): void {
    // Body: dark purple with glitchy red stroke
    const body = this.scene.add.rectangle(0, 0, 36, 36, 0x4a1a5a);
    body.setStrokeStyle(2, 0xcc2244);

    // Glowing red eyes
    const eyeL = this.scene.add.circle(-8, -4, 4, 0xff3333);
    const eyeR = this.scene.add.circle(8, -4, 4, 0xff3333);

    // Angry downward-pointing mouth triangle
    const mouth = this.scene.add.triangle(0, 10, -8, 0, 8, 0, 0, 10, 0x661122);

    this.visual.add([body, eyeL, eyeR, mouth]);

    // Perpetual eye pulse
    this.scene.tweens.add({
      targets: [eyeL, eyeR],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }

  update(): void {
    if (this.isDeadFlag) return;
    this.visual.setPosition(this.carrier.x, this.carrier.y);
  }

  takeDamage(amount: number, knockbackDir?: { x: number; y: number }): void {
    if (this.isDeadFlag) return;

    this.hp -= amount;
    this.spawnDamageNumber(amount);

    if (this.hp <= 0) {
      this.hp = 0;
      this.handleDeath();
      return;
    }

    this.flashWhite();

    if (knockbackDir) {
      this.applyKnockback(knockbackDir);
    }
  }

  private flashWhite(): void {
    const shapes = (this.visual.list as Phaser.GameObjects.GameObject[])
      .filter((go): go is Phaser.GameObjects.Shape => go instanceof Phaser.GameObjects.Shape);
    const origColors = shapes.map(s => s.fillColor);
    shapes.forEach(s => s.setFillStyle(0xffffff));
    this.scene.time.delayedCall(80, () => {
      if (this.isDeadFlag) return;
      shapes.forEach((s, i) => s.setFillStyle(origColors[i]));
    });
  }

  private spawnDamageNumber(amount: number): void {
    const x = this.carrier.x;
    const y = this.carrier.y - 18;
    const txt = this.scene.add.text(x, y, `${amount}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    this.scene.tweens.add({
      targets: txt,
      y: y - 20,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => { txt.destroy(); },
    });
  }

  private applyKnockback(dir: { x: number; y: number }): void {
    const body = this.carrier.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    body.setVelocity(dir.x * 280, dir.y * 280);
    this.scene.time.delayedCall(200, () => {
      if (!this.isDeadFlag) {
        const b = this.carrier.body as Phaser.Physics.Arcade.Body | null;
        if (b) b.setVelocity(0, 0);
      }
    });
  }

  private handleDeath(): void {
    this.isDeadFlag = true;
    const x = this.carrier.x;
    const y = this.carrier.y;

    // Red particle burst
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 200;
      const p = this.scene.add.rectangle(x, y, 4, 4, 0xff2222);
      p.setDepth(3);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed * 0.5,
        y: y + Math.sin(angle) * speed * 0.5 + 50,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => { p.destroy(); },
      });
    }

    this.visual.destroy();
    this.carrier.destroy();
    this.onDeath();
  }

  isDead(): boolean {
    return this.isDeadFlag;
  }

  getPhysicsCarrier(): Phaser.Physics.Arcade.Image {
    return this.carrier;
  }

  getX(): number { return this.carrier.x; }
  getY(): number { return this.carrier.y; }

  destroy(): void {
    if (this.isDeadFlag) return;
    this.isDeadFlag = true;
    this.visual.destroy();
    this.carrier.destroy();
  }
}
