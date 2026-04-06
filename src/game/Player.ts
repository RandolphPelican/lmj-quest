import Phaser from 'phaser';
import { TILE_SIZE, TileFlag } from '../shared/tiles';
import type { CharacterDefinition } from '../shared/characters';

export interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

const HITBOX_W = 24;
const HITBOX_H = 28;

export class Player {
  private readonly physicsImage: Phaser.Physics.Arcade.Image;
  private readonly visual: Phaser.GameObjects.Container;
  private readonly playfieldX: number;
  private readonly playfieldY: number;
  private readonly baseSpeed: number;

  private speedMult = 1.0;
  private inputEnabled = true;

  constructor(
    scene: Phaser.Scene,
    character: CharacterDefinition,
    x: number,
    y: number,
    playfieldX: number,
    playfieldY: number,
  ) {
    this.playfieldX = playfieldX;
    this.playfieldY = playfieldY;
    this.baseSpeed = character.stats.speed * 1.6;

    // Invisible physics carrier
    this.physicsImage = scene.physics.add.image(x, y, '__DEFAULT');
    this.physicsImage.setVisible(false);
    this.physicsImage.setDepth(0);
    const body = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    body.setSize(HITBOX_W, HITBOX_H);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(600, 600);

    // Visual container with Lincoln's compound shape (Phase 3 hardcoded)
    this.visual = scene.add.container(x, y);
    this.visual.setDepth(2);
    this.buildLincolnVisual(scene, character);
  }

  private buildLincolnVisual(scene: Phaser.Scene, character: CharacterDefinition): void {
    const body = scene.add.rectangle(0, 5, 32, 40, character.primaryColor);
    const helmet = scene.add.rectangle(0, -20, 28, 14, character.accentColor);
    const eyeL = scene.add.circle(-5, -20, 2, 0xffffff);
    const eyeR = scene.add.circle(5, -20, 2, 0xffffff);
    const sword = scene.add.triangle(22, 5, 0, -15, 0, 15, 10, 0, 0xcccccc);
    this.visual.add([body, helmet, eyeL, eyeR, sword]);
  }

  getPhysicsObject(): Phaser.Physics.Arcade.Image {
    return this.physicsImage;
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: WASDKeys): void {
    if (!this.inputEnabled) return;

    const body = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    const speed = this.baseSpeed * this.speedMult;

    let vx = 0;
    let vy = 0;

    const left  = cursors.left.isDown  || wasd.A.isDown;
    const right = cursors.right.isDown || wasd.D.isDown;
    const up    = cursors.up.isDown    || wasd.W.isDown;
    const down  = cursors.down.isDown  || wasd.S.isDown;

    if (left)  vx -= 1;
    if (right) vx += 1;
    if (up)    vy -= 1;
    if (down)  vy += 1;

    // Normalize diagonal so it isn't faster than cardinal
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    body.setVelocity(vx * speed, vy * speed);

    // Sync visual to physics body position
    this.visual.setPosition(this.physicsImage.x, this.physicsImage.y);
  }

  setPosition(x: number, y: number): void {
    this.physicsImage.setPosition(x, y);
    const body = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    this.visual.setPosition(x, y);
  }

  applyTerrainEffect(flags: number): void {
    this.speedMult = (flags & TileFlag.Tar) !== 0 ? 0.4 : 1.0;
  }

  enableInput(): void {
    this.inputEnabled = true;
  }

  disableInput(): void {
    this.inputEnabled = false;
    const body = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  getTileX(): number {
    return Math.floor((this.physicsImage.x - this.playfieldX) / TILE_SIZE);
  }

  getTileY(): number {
    return Math.floor((this.physicsImage.y - this.playfieldY) / TILE_SIZE);
  }

  getX(): number {
    return this.physicsImage.x;
  }

  getY(): number {
    return this.physicsImage.y;
  }
}
