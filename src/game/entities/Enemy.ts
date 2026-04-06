import Phaser from 'phaser';
import type { Player } from '../Player';
import type { Room } from '../Room';

export enum AIState {
  Idle        = 'IDLE',
  Chasing     = 'CHASE',
  Patrolling  = 'PATROL',
  Attacking   = 'ATTACK',
  Returning   = 'RETURN',
  Fleeing     = 'FLEE',
  Approaching = 'APPROACH',
  Dead        = 'DEAD',
}

export interface EnemyConfig {
  hp: number;
  speed: number;
  contactDamage: number;
  hitboxW: number;
  hitboxH: number;
}

const LABEL_DEPTH  = 15;
const DAMAGE_DEPTH = 5;

export abstract class Enemy {
  protected readonly scene: Phaser.Scene;
  protected carrier: Phaser.Physics.Arcade.Image;
  protected visual: Phaser.GameObjects.Container;
  protected state: AIState = AIState.Idle;
  protected hp: number;
  protected readonly speed: number;
  protected knockbackMs = 0;

  private readonly config: EnemyConfig;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private wallCollider: Phaser.Physics.Arcade.Collider | null = null;
  private respawnTimer: Phaser.Time.TimerEvent | null = null;
  private isForcedDestroyed = false;
  private isAlive = true;
  private debugMode = false;
  private hpLabel: Phaser.GameObjects.Text | null = null;
  private stateLabel: Phaser.GameObjects.Text | null = null;
  private readonly onSetDebugMode: (on: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyConfig,
  ) {
    this.scene   = scene;
    this.spawnX  = x;
    this.spawnY  = y;
    this.config  = config;
    this.hp      = config.hp;
    this.speed   = config.speed;

    this.carrier = this.createCarrier(x, y, config);
    this.visual  = scene.add.container(x, y);
    this.visual.setDepth(1);

    this.onSetDebugMode = (on: boolean) => {
      this.debugMode = on;
      this.updateLabelVisibility();
    };
    scene.events.on('enemy:setDebugMode', this.onSetDebugMode);
  }

  private createCarrier(
    x: number,
    y: number,
    cfg: EnemyConfig,
  ): Phaser.Physics.Arcade.Image {
    const img  = this.scene.physics.add.image(x, y, '__DEFAULT');
    img.setVisible(false);
    img.setDepth(0);
    const body = img.body as Phaser.Physics.Arcade.Body;
    body.setSize(cfg.hitboxW, cfg.hitboxH);
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(400, 400);
    return img;
  }

  protected abstract buildVisual(container: Phaser.GameObjects.Container): void;
  protected abstract updateAI(
    time: number,
    delta: number,
    player: Player,
    room: Room,
  ): void;

  // ── Wall-collider lifecycle ────────────────────────────────────────────────

  wireWallCollider(physicsGroup: Phaser.Physics.Arcade.StaticGroup): void {
    if (this.wallCollider) {
      this.wallCollider.destroy();
      this.wallCollider = null;
    }
    if (!this.isAlive) return;
    this.wallCollider = this.scene.physics.add.collider(this.carrier, physicsGroup);
  }

  clearWallCollider(): void {
    if (this.wallCollider) {
      this.wallCollider.destroy();
      this.wallCollider = null;
    }
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  isDead(): boolean { return !this.isAlive; }
  getX(): number    { return this.carrier.x; }
  getY(): number    { return this.carrier.y; }

  getPhysicsCarrier(): Phaser.Physics.Arcade.Image { return this.carrier; }
  getContactDamage(): number { return this.config.contactDamage; }

  setVisualVisible(visible: boolean): void {
    this.visual.setVisible(visible);
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  takeDamage(amount: number, knockbackDir?: { x: number; y: number }): void {
    if (!this.isAlive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.spawnDamageNumber(amount);
    this.flashHit();

    if (knockbackDir) {
      const body = this.carrier.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(knockbackDir.x * 280, knockbackDir.y * 280);
      this.knockbackMs = 200;
    }

    if (this.hp <= 0) this.handleDeath();
  }

  private flashHit(): void {
    this.scene.tweens.add({
      targets: this.visual,
      alpha: 0.2,
      duration: 50,
      yoyo: true,
      onComplete: () => { this.visual.setAlpha(1); },
    });
  }

  private spawnDamageNumber(amount: number): void {
    const x   = this.carrier.x;
    const y   = this.carrier.y - 20;
    const txt = this.scene.add.text(x, y, `-${amount}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ff4444',
    }).setOrigin(0.5, 0.5).setDepth(DAMAGE_DEPTH);
    this.scene.tweens.add({
      targets: txt,
      y: y - 30,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private handleDeath(): void {
    this.isAlive = false;
    this.state   = AIState.Dead;
    this.clearWallCollider();
    this.destroyLabels();

    // Particle burst
    for (let i = 0; i < 12; i++) {
      const angle    = (i / 12) * Math.PI * 2;
      const cx       = this.carrier.x;
      const cy       = this.carrier.y;
      const particle = this.scene.add.circle(cx, cy, 5, 0xffffff);
      particle.setDepth(DAMAGE_DEPTH);
      const speed = 40 + Math.random() * 60;
      this.scene.tweens.add({
        targets: particle,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    this.visual.setVisible(false);
    (this.carrier.body as Phaser.Physics.Arcade.Body).setEnable(false);

    if (!this.isForcedDestroyed) {
      this.respawnTimer = this.scene.time.delayedCall(5000, () => {
        this.respawnTimer = null;
        if (!this.isForcedDestroyed) this.selfRespawn();
      });
    }
  }

  private selfRespawn(): void {
    this.carrier.destroy();
    this.carrier = this.createCarrier(this.spawnX, this.spawnY, this.config);

    this.visual.destroy();
    this.visual = this.scene.add.container(this.spawnX, this.spawnY);
    this.visual.setDepth(1);
    this.buildVisual(this.visual);

    this.hp          = this.config.hp;
    this.knockbackMs = 0;
    this.isAlive     = true;
    this.state       = AIState.Idle;

    if (this.debugMode) this.createLabels();

    this.scene.events.emit('enemy:respawned', this);
  }

  forceDestroy(): void {
    this.isForcedDestroyed = true;
    if (this.respawnTimer) {
      this.respawnTimer.destroy();
      this.respawnTimer = null;
    }
    this.clearWallCollider();
    this.destroyLabels();
    this.scene.events.off('enemy:setDebugMode', this.onSetDebugMode);
    this.visual.destroy();
    this.carrier.destroy();
  }

  // ── Debug labels ────────────────────────────────────────────────────────────

  private createLabels(): void {
    this.hpLabel = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff4444',
      backgroundColor: '#00000099', padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1).setDepth(LABEL_DEPTH);

    this.stateLabel = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#88ffaa',
      backgroundColor: '#00000099', padding: { x: 2, y: 1 },
    }).setOrigin(0.5, 1).setDepth(LABEL_DEPTH);
  }

  private destroyLabels(): void {
    this.hpLabel?.destroy();
    this.hpLabel = null;
    this.stateLabel?.destroy();
    this.stateLabel = null;
  }

  private updateLabelVisibility(): void {
    if (this.debugMode && this.isAlive) {
      if (!this.hpLabel) this.createLabels();
    } else {
      this.destroyLabels();
    }
  }

  private updateLabels(): void {
    if (!this.hpLabel || !this.stateLabel) return;
    const x     = this.carrier.x;
    const baseY = this.carrier.y - 20;
    this.hpLabel.setPosition(x, baseY - 14);
    this.hpLabel.setText(`HP:${this.hp}/${this.config.hp}`);
    this.stateLabel.setPosition(x, baseY);
    this.stateLabel.setText(this.state);
  }

  // ── Main update ─────────────────────────────────────────────────────────────

  update(time: number, delta: number, player: Player, room: Room): void {
    if (!this.isAlive) return;

    this.visual.setPosition(this.carrier.x, this.carrier.y);

    if (this.knockbackMs > 0) {
      this.knockbackMs = Math.max(0, this.knockbackMs - delta);
      if (this.knockbackMs === 0) {
        (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      this.updateLabels();
      return;
    }

    this.updateAI(time, delta, player, room);
    this.updateLabels();
  }
}
