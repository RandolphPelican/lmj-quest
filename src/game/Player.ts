import Phaser from 'phaser';
import { TILE_SIZE, TileFlag } from '../shared/tiles';
import type { CharacterDefinition } from '../shared/characters';

export interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export enum Facing { East, West, North, South }

const HITBOX_W = 24;
const HITBOX_H = 28;

export class Player {
  private readonly scene: Phaser.Scene;
  private readonly physicsImage: Phaser.Physics.Arcade.Image;
  private readonly visual: Phaser.GameObjects.Container;
  private readonly sword: Phaser.GameObjects.Triangle;
  private readonly playfieldX: number;
  private readonly playfieldY: number;
  private readonly baseSpeed: number;

  // Terrain
  private speedMult = 1.0;
  private inputEnabled = true;

  // Facing
  private facing: Facing = Facing.East;

  // Stats
  private readonly maxHp: number;
  private hp: number;
  private readonly maxMp: number;
  private mp: number;

  // Combat cooldowns (ms remaining)
  private swordCooldownMs = 0;
  private bashCooldownMs = 0;

  // Active hitboxes
  private swordHitbox: Phaser.Physics.Arcade.Image | null = null;
  private bashHitbox: Phaser.Physics.Arcade.Image | null = null;
  private bashCircleVisual: Phaser.GameObjects.Arc | null = null;

  // One-shot hit flags per attack instance
  private swordHitConnected = false;
  private bashHitConnected = false;

  // Prevents mid-swing position override
  private swinging = false;

  // Death / invincibility
  public onDeath: (() => void) | null = null;
  private dead = false;
  private invincibleMs = 0;
  private readonly bodyShapes: Phaser.GameObjects.Shape[] = [];
  private readonly bodyShapeColors: number[] = [];

  constructor(
    scene: Phaser.Scene,
    character: CharacterDefinition,
    x: number,
    y: number,
    playfieldX: number,
    playfieldY: number,
  ) {
    this.scene = scene;
    this.playfieldX = playfieldX;
    this.playfieldY = playfieldY;
    this.baseSpeed = character.stats.speed * 1.6;
    this.maxHp = character.stats.hp;
    this.hp = character.stats.hp;
    this.maxMp = character.stats.mp;
    this.mp = character.stats.mp;

    // Invisible physics carrier
    this.physicsImage = scene.physics.add.image(x, y, '__DEFAULT');
    this.physicsImage.setVisible(false);
    this.physicsImage.setDepth(0);
    const body = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    body.setSize(HITBOX_W, HITBOX_H);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(600, 600);

    // Visual container with Lincoln's compound shape
    this.visual = scene.add.container(x, y);
    this.visual.setDepth(2);
    this.sword = this.buildLincolnVisual(scene, character);
  }

  private buildLincolnVisual(
    scene: Phaser.Scene,
    character: CharacterDefinition,
  ): Phaser.GameObjects.Triangle {
    const body   = scene.add.rectangle(0, 5, 32, 40, character.primaryColor);
    const helmet = scene.add.rectangle(0, -20, 28, 14, character.accentColor);
    const eyeL   = scene.add.circle(-5, -20, 2, 0xffffff);
    const eyeR   = scene.add.circle(5, -20, 2, 0xffffff);
    const sword  = scene.add.triangle(22, 5, 0, -15, 0, 15, 10, 0, 0xcccccc);
    this.visual.add([body, helmet, eyeL, eyeR, sword]);

    this.bodyShapes.push(body, helmet, eyeL, eyeR);
    this.bodyShapeColors.push(character.primaryColor, character.accentColor, 0xffffff, 0xffffff);

    return sword;
  }

  // ── Sword position by facing ────────────────────────────────────────────────

  private updateSwordPosition(): void {
    if (this.facing === Facing.East) {
      this.sword.setPosition(22, 5);
      this.sword.setRotation(0);
    } else if (this.facing === Facing.West) {
      this.sword.setPosition(-22, 5);
      this.sword.setRotation(Math.PI);
    } else if (this.facing === Facing.North) {
      this.sword.setPosition(5, -22);
      this.sword.setRotation(-Math.PI / 2);
    } else {
      this.sword.setPosition(5, 22);
      this.sword.setRotation(Math.PI / 2);
    }
  }

  private getSwordBaseRotation(): number {
    if (this.facing === Facing.East)  return 0;
    if (this.facing === Facing.West)  return Math.PI;
    if (this.facing === Facing.North) return -Math.PI / 2;
    return Math.PI / 2;
  }

  private getFacingVector(): { x: number; y: number } {
    if (this.facing === Facing.East)  return { x: 1,  y: 0 };
    if (this.facing === Facing.West)  return { x: -1, y: 0 };
    if (this.facing === Facing.North) return { x: 0,  y: -1 };
    return { x: 0, y: 1 };
  }

  // ── Attacks ─────────────────────────────────────────────────────────────────

  trySwingSword(): void {
    if (this.swordCooldownMs > 0 || this.swinging) return;

    this.swordCooldownMs = 300;
    this.swordHitConnected = false;
    this.swinging = true;

    const baseRot = this.getSwordBaseRotation();
    this.sword.setRotation(baseRot - Math.PI / 4);

    this.spawnSwordHitbox();

    this.scene.tweens.add({
      targets: this.sword,
      rotation: baseRot + Math.PI / 4,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroySwordHitbox();
        this.scene.tweens.add({
          targets: this.sword,
          rotation: baseRot,
          duration: 100,
          ease: 'Linear',
          onComplete: () => {
            this.swinging = false;
            this.updateSwordPosition();
          },
        });
      },
    });
  }

  private spawnSwordHitbox(): void {
    const fv = this.getFacingVector();
    const isVert = fv.x === 0;
    const hx = this.physicsImage.x + fv.x * 24;
    const hy = this.physicsImage.y + fv.y * 24;
    const hw = isVert ? 32 : 40;
    const hh = isVert ? 40 : 32;

    this.swordHitbox = this.scene.physics.add.staticImage(hx, hy, '__DEFAULT');
    this.swordHitbox.setVisible(false);
    this.swordHitbox.setDepth(0);
    (this.swordHitbox.body as Phaser.Physics.Arcade.StaticBody).setSize(hw, hh);
    this.swordHitbox.refreshBody();
  }

  private destroySwordHitbox(): void {
    if (this.swordHitbox) {
      this.swordHitbox.destroy();
      this.swordHitbox = null;
    }
  }

  tryShieldBash(): void {
    if (this.bashCooldownMs > 0 || this.mp < 15) return;

    this.mp -= 15;
    this.bashCooldownMs = 500;
    this.bashHitConnected = false;

    // NOTE: The lunge fires in the direction Lincoln is currently facing.
    // Bug log: this previously fired backward, which we're saving as a pattern
    // for Dad's Atomic Dutch Oven (fart) spell — Dad's signature spell will fire
    // OPPOSITE his facing direction, since farts come out behind you. Reuse the
    // inverted vector logic from the old buggy version when wiring Dad's combat
    // in Phase 4.5.
    const fv = this.getFacingVector();
    const physBody = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    this.inputEnabled = false;
    physBody.setVelocity(fv.x * 200, fv.y * 200);

    // Stop lunge, spawn bash effects at destination, re-enable input
    this.scene.time.delayedCall(120, () => {
      physBody.setVelocity(0, 0);
      this.spawnBashHitbox();
      this.inputEnabled = true;
    });

    // Expire bash hitbox
    this.scene.time.delayedCall(300, () => {
      this.destroyBashHitbox();
    });
  }

  private spawnBashHitbox(): void {
    const x = this.physicsImage.x;
    const y = this.physicsImage.y;

    this.bashHitbox = this.scene.physics.add.staticImage(x, y, '__DEFAULT');
    this.bashHitbox.setVisible(false);
    this.bashHitbox.setDepth(0);
    (this.bashHitbox.body as Phaser.Physics.Arcade.StaticBody).setSize(100, 100);
    this.bashHitbox.refreshBody();

    // Expanding visual circle
    this.bashCircleVisual = this.scene.add.circle(x, y, 25, 0x4488ff);
    this.bashCircleVisual.setAlpha(0.8);
    this.bashCircleVisual.setScale(0.1);
    this.bashCircleVisual.setDepth(3);

    this.scene.tweens.add({
      targets: this.bashCircleVisual,
      scaleX: 2.0,
      scaleY: 2.0,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.bashCircleVisual) {
          this.bashCircleVisual.destroy();
          this.bashCircleVisual = null;
        }
      },
    });
  }

  private destroyBashHitbox(): void {
    if (this.bashHitbox) {
      this.bashHitbox.destroy();
      this.bashHitbox = null;
    }
    // bashCircleVisual is destroyed by its own tween onComplete
  }

  // ── Movement update ─────────────────────────────────────────────────────────

  getPhysicsObject(): Phaser.Physics.Arcade.Image {
    return this.physicsImage;
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: WASDKeys): void {
    // Tick cooldowns
    const dt = this.scene.game.loop.delta;
    if (this.swordCooldownMs > 0) this.swordCooldownMs = Math.max(0, this.swordCooldownMs - dt);
    if (this.bashCooldownMs  > 0) this.bashCooldownMs  = Math.max(0, this.bashCooldownMs  - dt);

    // Always sync visual (even during lunge when inputEnabled=false)
    this.visual.setPosition(this.physicsImage.x, this.physicsImage.y);

    // Tick invincibility blink
    if (this.invincibleMs > 0) {
      this.invincibleMs = Math.max(0, this.invincibleMs - dt);
      if (this.invincibleMs > 0) {
        this.visual.setAlpha(Math.floor(this.invincibleMs / 100) % 2 === 0 ? 0.3 : 1.0);
      } else {
        this.visual.setAlpha(1);
        this.setBodyColors(null);
      }
    }

    if (!this.inputEnabled) return;

    const physBody = this.physicsImage.body as Phaser.Physics.Arcade.Body;
    const speed = this.baseSpeed * this.speedMult;

    const left  = cursors.left.isDown  || wasd.A.isDown;
    const right = cursors.right.isDown || wasd.D.isDown;
    const up    = cursors.up.isDown    || wasd.W.isDown;
    const down  = cursors.down.isDown  || wasd.S.isDown;

    // Snap facing to last pressed cardinal direction
    if      (right) this.facing = Facing.East;
    else if (left)  this.facing = Facing.West;
    else if (down)  this.facing = Facing.South;
    else if (up)    this.facing = Facing.North;

    if (!this.swinging) this.updateSwordPosition();

    let vx = 0;
    let vy = 0;
    if (left)  vx -= 1;
    if (right) vx += 1;
    if (up)    vy -= 1;
    if (down)  vy += 1;

    if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }

    physBody.setVelocity(vx * speed, vy * speed);
  }

  setPosition(x: number, y: number): void {
    this.physicsImage.setPosition(x, y);
    (this.physicsImage.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.visual.setPosition(x, y);
  }

  applyTerrainEffect(flags: number): void {
    this.speedMult = (flags & TileFlag.Tar) !== 0 ? 0.4 : 1.0;
  }

  enableInput(): void  { this.inputEnabled = true; }

  disableInput(): void {
    this.inputEnabled = false;
    (this.physicsImage.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  // ── Positional helpers ──────────────────────────────────────────────────────

  getTileX(): number {
    return Math.floor((this.physicsImage.x - this.playfieldX) / TILE_SIZE);
  }

  getTileY(): number {
    return Math.floor((this.physicsImage.y - this.playfieldY) / TILE_SIZE);
  }

  getX(): number { return this.physicsImage.x; }
  getY(): number { return this.physicsImage.y; }

  // ── Stats getters ───────────────────────────────────────────────────────────

  getHP(): number    { return this.hp; }
  getMaxHP(): number { return this.maxHp; }
  getMP(): number    { return this.mp; }
  getMaxMP(): number { return this.maxMp; }

  // ── Combat state accessors (used by GameScene and DebugOverlay) ─────────────

  getSwordHitbox(): Phaser.Physics.Arcade.Image | null { return this.swordHitbox; }
  getBashHitbox():  Phaser.Physics.Arcade.Image | null { return this.bashHitbox; }

  isSwordHitConnected(): boolean { return this.swordHitConnected; }
  markSwordHitConnected(): void  { this.swordHitConnected = true; }
  isBashHitConnected(): boolean  { return this.bashHitConnected; }
  markBashHitConnected(): void   { this.bashHitConnected = true; }

  getSwordCooldown(): number { return this.swordCooldownMs; }
  getBashCooldown():  number { return this.bashCooldownMs; }

  // ── Damage & respawn ────────────────────────────────────────────────────────

  isDead(): boolean       { return this.dead; }
  isInvincible(): boolean { return this.invincibleMs > 0; }

  takeDamage(amount: number): void {
    if (this.invincibleMs > 0 || this.dead) return;
    this.hp           = Math.max(0, this.hp - amount);
    this.invincibleMs = 500;
    this.setBodyColors(0xff2222);
    this.scene.time.delayedCall(120, () => {
      if (!this.dead) this.setBodyColors(null);
    });
    if (this.hp <= 0) this.handlePlayerDeath();
  }

  private handlePlayerDeath(): void {
    this.dead         = true;
    this.inputEnabled = false;
    (this.physicsImage.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this.visual,
      alpha: 0,
      duration: 400,
      ease: 'Linear',
      onComplete: () => {
        this.scene.time.delayedCall(400, () => { this.onDeath?.(); });
      },
    });
  }

  respawn(x: number, y: number): void {
    this.hp           = this.maxHp;
    this.mp           = this.maxMp;
    this.dead         = false;
    this.invincibleMs = 0;
    this.swordCooldownMs = 0;
    this.bashCooldownMs  = 0;
    this.swinging     = false;
    this.setPosition(x, y);
    this.visual.setAlpha(1);
    this.setBodyColors(null);
    this.inputEnabled = true;
  }

  private setBodyColors(color: number | null): void {
    for (let i = 0; i < this.bodyShapes.length; i++) {
      this.bodyShapes[i].setFillStyle(color !== null ? color : this.bodyShapeColors[i]);
    }
  }
}
