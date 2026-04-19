import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

type SentinelPhase = 'idle' | 'aim' | 'fire' | 'advance' | 'strike' | 'retreat';

const PROJECTILE_DMG    = 10;
const ADVANCE_SPEED     = 60;
const RETREAT_SPEED     = 100;
const HOME_REACH_RADIUS = 32;

export class Sentinel extends Enemy {
  private phase: SentinelPhase = 'idle';
  private phaseTimer = 0;
  private readonly homeX: number;
  private readonly homeY: number;
  private spawned = false;

  // Facing direction (unit vector) — updated during AIM, held for FIRE/STRIKE
  private facingX = 0;
  private facingY = 1; // default south

  private spear!: Phaser.GameObjects.Rectangle;
  private strikeHitbox: Phaser.Physics.Arcade.Image | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            40,
      speed:         ADVANCE_SPEED,
      contactDamage: 8,
      hitboxW:       20,
      hitboxH:       44,
    });
    this.homeX = x;
    this.homeY = y;
    this.buildVisual(this.visual);
    // Start dormant: invisible, physics disabled
    this.visual.setVisible(false);
    (this.carrier.body as Phaser.Physics.Arcade.Body).setEnable(false);
  }

  isSpawned(): boolean { return this.spawned; }

  spawn(): void {
    if (this.spawned) return;
    this.spawned = true;
    this.visual.setVisible(true);
    (this.carrier.body as Phaser.Physics.Arcade.Body).setEnable(true);
  }

  getStrikeHitbox(): Phaser.Physics.Arcade.Image | null { return this.strikeHitbox; }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const body   = this.scene.add.rectangle(0,   5, 20, 44, 0x4a1a6a);
    const helmet = this.scene.add.rectangle(0, -17, 20, 10, 0x6a2a8a);
    const eyeL   = this.scene.add.circle(-4, -17, 2, 0xff4444);
    const eyeR   = this.scene.add.circle( 4, -17, 2, 0xff4444);
    this.spear   = this.scene.add.rectangle(0,  22, 4, 32, 0xaaaaaa);
    container.add([body, helmet, eyeL, eyeR, this.spear]);
  }

  private enterPhase(phase: SentinelPhase): void {
    // Destroy strike hitbox on any phase exit except while still in strike
    if (phase !== 'strike') this.destroyStrikeHitbox();

    this.phase      = phase;
    this.phaseTimer = 0;

    if (phase === 'aim') {
      this.scene.tweens.add({
        targets:  this.visual,
        scaleX:   1.1, scaleY: 1.1,
        duration: 300, yoyo: true, ease: 'Sine.easeInOut',
      });
    }
    if (phase === 'fire')   this.fireProjectile();
    if (phase === 'strike') this.spawnStrikeHitbox();
  }

  private fireProjectile(): void {
    this.scene.events.emit('enemy:spawnProjectile', {
      x:      this.carrier.x,
      y:      this.carrier.y,
      dirX:   this.facingX,
      dirY:   this.facingY,
      damage: PROJECTILE_DMG,
    });
  }

  private spawnStrikeHitbox(): void {
    const isVert = Math.abs(this.facingY) > Math.abs(this.facingX);
    const hx = this.carrier.x + this.facingX * 24;
    const hy = this.carrier.y + this.facingY * 24;
    this.strikeHitbox = this.scene.physics.add.staticImage(hx, hy, '__DEFAULT');
    this.strikeHitbox.setVisible(false);
    (this.strikeHitbox.body as Phaser.Physics.Arcade.StaticBody).setSize(
      isVert ? 20 : 48,
      isVert ? 48 : 20,
    );
    this.strikeHitbox.refreshBody();
  }

  private destroyStrikeHitbox(): void {
    if (this.strikeHitbox) {
      this.strikeHitbox.destroy();
      this.strikeHitbox = null;
    }
  }

  private updateSpear(): void {
    this.spear.setPosition(this.facingX * 22, this.facingY * 22);
    this.spear.setRotation(Math.atan2(this.facingY, this.facingX) + Math.PI / 2);
  }

  private stopMovement(): void {
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  protected updateAI(
    _time: number,
    delta: number,
    player: Player,
    _room: Room,
  ): void {
    this.phaseTimer += delta;

    const body  = this.carrier.body as Phaser.Physics.Arcade.Body;
    const pdx   = player.getX() - this.carrier.x;
    const pdy   = player.getY() - this.carrier.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;

    switch (this.phase) {

      case 'idle':
        this.stopMovement();
        this.state = AIState.Idle;
        if (this.phaseTimer >= 1000) this.enterPhase('aim');
        break;

      case 'aim':
        this.stopMovement();
        this.state   = AIState.Idle;
        this.facingX = pdx / pdist;
        this.facingY = pdy / pdist;
        this.updateSpear();
        if (this.phaseTimer >= 600) this.enterPhase('fire');
        break;

      case 'fire':
        this.stopMovement();
        this.state = AIState.Attacking;
        if (this.phaseTimer >= 100) this.enterPhase('advance');
        break;

      case 'advance':
        this.state = AIState.Chasing;
        body.setVelocity(
          (pdx / pdist) * ADVANCE_SPEED,
          (pdy / pdist) * ADVANCE_SPEED,
        );
        if (this.phaseTimer >= 800) this.enterPhase('strike');
        break;

      case 'strike':
        this.stopMovement();
        this.state = AIState.Attacking;
        if (this.phaseTimer >= 200) this.enterPhase('retreat');
        break;

      case 'retreat': {
        this.state  = AIState.Returning;
        const hdx   = this.homeX - this.carrier.x;
        const hdy   = this.homeY - this.carrier.y;
        const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hdist <= HOME_REACH_RADIUS) {
          this.stopMovement();
          this.enterPhase('idle');
        } else {
          body.setVelocity(
            (hdx / hdist) * RETREAT_SPEED,
            (hdy / hdist) * RETREAT_SPEED,
          );
        }
        break;
      }
    }
  }
}
