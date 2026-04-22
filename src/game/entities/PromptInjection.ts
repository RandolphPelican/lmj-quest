// PromptInjection — retaliator enemy. Ignores the player completely until
// the player attacks within 140px. Once provoked, it wakes up angry and
// mirrors attacks back as projectiles. It never chases, never walks, never
// touches. The only way to lose to this enemy is to attack it. Pacifist-run
// viable — walk past and it stays dormant forever.

import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const HP                   = 40;
// 140px detection radius — roughly two tile-widths plus change, matches sword-swing range
const DETECTION_RADIUS     = 140;
const PROJECTILE_DMG       = 12;
// 800ms cooldown prevents projectile spam if the player panic-swings in range
const RETALIATION_COOLDOWN = 800;
const RETALIATE_MS         = 280;

const DORMANT_OUTER_COLOR  = 0x8844cc;
const DORMANT_INNER_COLOR  = 0xbb88ff;
const ACTIVE_OUTER_COLOR   = 0xff3344;
const ACTIVE_INNER_COLOR   = 0xff8899;

enum PIState {
  DORMANT   = 'prompt:dormant',
  RETALIATE = 'prompt:retaliate',
  ACTIVE    = 'prompt:active',
}

export default class PromptInjection extends Enemy {
  private _piState:            PIState = PIState.DORMANT;
  private _outerHex:           Phaser.GameObjects.Polygon | null = null;
  private _innerHex:           Phaser.GameObjects.Polygon | null = null;
  private _centerDot:          Phaser.GameObjects.Arc | null = null;
  private _pulseTween:         Phaser.Tweens.Tween | null = null;
  // _hasBeenProvoked: one-way latch, by design — once you wake it up, it stays awake
  private _hasBeenProvoked     = false;
  private _retaliateTimer      = 0;
  private _retaliationCooldown = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            HP,
      speed:         0,
      contactDamage: 0,
      hitboxW:       28,
      hitboxH:       28,
    });
    (this.carrier.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  // Six vertices of a regular hexagon at a given radius, flat-top orientation
  private hexPoints(radius: number): { x: number; y: number }[] {
    return Array.from({ length: 6 }, (_: unknown, i: number) => {
      const angle = (i * Math.PI) / 3;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Reset all state — covers initial construction and post-respawn rebuild
    if (this._pulseTween) {
      this._pulseTween.stop();
      this._pulseTween = null;
    }
    this._piState             = PIState.DORMANT;
    this._hasBeenProvoked     = false;
    this._retaliateTimer      = 0;
    this._retaliationCooldown = 0;
    this._outerHex            = null;
    this._innerHex            = null;
    this._centerDot           = null;

    // Re-freeze carrier after respawn rebuild
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setVelocity(0, 0);

    // Outer hexagon — calm purple, ~26px radius
    this._outerHex = this.scene.add.polygon(0, 0, this.hexPoints(26), DORMANT_OUTER_COLOR);
    // Inner hexagon — lighter purple, ~14px radius
    this._innerHex = this.scene.add.polygon(0, 0, this.hexPoints(14), DORMANT_INNER_COLOR);
    // White center dot
    this._centerDot = this.scene.add.circle(0, 0, 2, 0xffffff);

    container.add([this._outerHex, this._innerHex, this._centerDot]);

    // Gentle dormant pulse: outer hex 1.0 → 1.08 → 1.0 over 1600ms
    this._pulseTween = this.scene.tweens.add({
      targets:  this._outerHex,
      scaleX:   1.08,
      scaleY:   1.08,
      duration: 800,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── State transitions ────────────────────────────────────────────────────────

  private enterRetaliate(player: Player): void {
    this._piState        = PIState.RETALIATE;
    this._retaliateTimer = 0;

    // Kill dormant pulse
    if (this._pulseTween) {
      this._pulseTween.stop();
      this._pulseTween = null;
    }

    // Color tween outer hex: purple → red over 200ms
    const outerProgress = { t: 0 };
    this.scene.tweens.add({
      targets:  outerProgress,
      t:        1,
      duration: 200,
      ease:     'Linear',
      onUpdate: () => {
        const t = outerProgress.t;
        const r = Math.round(0x88 + (0xff - 0x88) * t);
        const g = Math.round(0x44 + (0x33 - 0x44) * t);
        const b = Math.round(0xcc + (0x44 - 0xcc) * t);
        this._outerHex?.setFillStyle((r << 16) | (g << 8) | b);
      },
    });

    // Color tween inner hex: light-purple → pink over 200ms
    const innerProgress = { t: 0 };
    this.scene.tweens.add({
      targets:  innerProgress,
      t:        1,
      duration: 200,
      ease:     'Linear',
      onUpdate: () => {
        const t = innerProgress.t;
        const r = Math.round(0xbb + (0xff - 0xbb) * t);
        const g = Math.round(0x88 + (0x88 - 0x88) * t); // stays at 0x88
        const b = Math.round(0xff + (0x99 - 0xff) * t);
        this._innerHex?.setFillStyle((r << 16) | (g << 8) | b);
      },
    });

    // Center dot turns black immediately
    this._centerDot?.setFillStyle(0x000000);

    // Fire one immediate retaliating projectile toward the player
    const dx   = player.getX() - this.carrier.x;
    const dy   = player.getY() - this.carrier.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.fireProjectile(dx, dy, dist);
  }

  private enterActive(): void {
    this._piState = PIState.ACTIVE;

    // Snap to final red colors in case the tween didn't fully complete
    this._outerHex?.setFillStyle(ACTIVE_OUTER_COLOR);
    this._innerHex?.setFillStyle(ACTIVE_INNER_COLOR);
    this._centerDot?.setFillStyle(0x000000);

    // Aggressive pulse: 1.0 → 1.15 → 1.0 over 900ms
    this._pulseTween = this.scene.tweens.add({
      targets:  this._outerHex,
      scaleX:   1.15,
      scaleY:   1.15,
      duration: 450,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  private fireProjectile(dx: number, dy: number, dist: number): void {
    const len = dist || 1;
    this.scene.events.emit('enemy:spawnProjectile', {
      x:      this.carrier.x,
      y:      this.carrier.y,
      dirX:   dx / len,
      dirY:   dy / len,
      damage: PROJECTILE_DMG,
    });
  }

  // ── AI ───────────────────────────────────────────────────────────────────────

  protected updateAI(
    _time:  number,
    delta:  number,
    player: Player,
    _room:  Room,
  ): void {
    // Drive the base-class state label to show the PromptInjection-specific state string
    this.state = this._piState as unknown as AIState;

    // Always static — never moves in any state
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    const dx     = player.getX() - this.carrier.x;
    const dy     = player.getY() - this.carrier.y;
    const distSq = dx * dx + dy * dy;
    const dist   = Math.sqrt(distSq) || 1;
    const inRange = distSq < DETECTION_RADIUS * DETECTION_RADIUS;

    // Detect whether the player's attack hitboxes are currently live
    const playerAttacking = player.getSwordHitbox() !== null || player.getBashHitbox() !== null;

    switch (this._piState) {
      case PIState.DORMANT: {
        if (playerAttacking && inRange && !this._hasBeenProvoked) {
          this._hasBeenProvoked = true;
          this.enterRetaliate(player);
        }
        break;
      }

      case PIState.RETALIATE: {
        this._retaliateTimer += delta;
        if (this._retaliateTimer >= RETALIATE_MS) {
          this.enterActive();
        }
        break;
      }

      case PIState.ACTIVE: {
        if (this._retaliationCooldown > 0) {
          this._retaliationCooldown = Math.max(0, this._retaliationCooldown - delta);
        }
        if (playerAttacking && inRange && this._retaliationCooldown <= 0) {
          this._retaliationCooldown = RETALIATION_COOLDOWN;
          this.fireProjectile(dx, dy, dist);
        }
        break;
      }
    }
  }
}
