// Gaslight — mimic enemy that impersonates a chicken-nugget loot pickup. Proximity trigger reveals its true form, dealing 20 ambush damage, then becomes a weak chaser.

import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const HUNT_SPEED     = 110;
const NUGGET_COLOR   = 0xd4a84b;  // chicken-nugget gold
const ROTTEN_COLOR   = 0x8a6a1a;  // post-reveal darkened nugget
const REVEAL_MS      = 320;       // total reveal animation duration (120ms scale + 200ms teeth)
// 40px proximity trigger matches the player's typical pickup radius for floor loot
const TRIGGER_RADIUS = 40;

enum GaslightState {
  DISGUISED = 'gaslight:disguise',
  REVEAL    = 'gaslight:reveal',
  HUNT      = 'gaslight:hunt',
}

export default class Gaslight extends Enemy {
  private _gaslightState:      GaslightState = GaslightState.DISGUISED;
  private _nuggetCircle:       Phaser.GameObjects.Arc | null = null;
  private _bobTween:           Phaser.Tweens.Tween | null = null;
  private _revealTimer         = 0;
  private _revealDamageDealt   = false;
  private _revealTeeth:        Phaser.GameObjects.Triangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            15,
      speed:         HUNT_SPEED,
      contactDamage: 0,   // runtime value supplied by getContactDamage() override
      hitboxW:       24,
      hitboxH:       24,
    });
    // Freeze physics — Gaslight is fully static while disguised
    (this.carrier.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.buildVisual(this.visual);
  }

  // Returns 0 while disguised/revealing; 8 once unmasked as a chaser
  override getContactDamage(): number {
    return this._gaslightState === GaslightState.HUNT ? 8 : 0;
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Reset all internal state — handles both initial construction and post-respawn rebuild
    if (this._bobTween) {
      this._bobTween.stop();
      this._bobTween = null;
    }
    this._gaslightState     = GaslightState.DISGUISED;
    this._revealDamageDealt = false;
    this._revealTimer       = 0;
    this._revealTeeth       = [];
    this._nuggetCircle      = null;

    // Re-freeze physics carrier after respawn rebuild
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setVelocity(0, 0);

    // Nugget circle — radius 12, chicken-nugget gold, mimics LootItem appearance
    this._nuggetCircle = this.scene.add.circle(0, 0, 12, NUGGET_COLOR);
    container.add(this._nuggetCircle);

    // Slow sine bob ±3px over 1200ms — identical feel to a real floor loot pickup
    this._bobTween = this.scene.tweens.add({
      targets:  this._nuggetCircle,
      y:        { from: -3, to: 3 },
      duration: 600,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ── State transitions ────────────────────────────────────────────────────────

  private enterReveal(player: Player): void {
    this._gaslightState = GaslightState.REVEAL;
    this._revealTimer   = 0;

    // Stop the disguise bob and snap circle back to vertical center
    if (this._bobTween) {
      this._bobTween.stop();
      this._bobTween = null;
    }
    if (this._nuggetCircle) this._nuggetCircle.setY(0);

    // Scale burst: 1.0 → 1.3 over 120ms
    if (this._nuggetCircle) {
      this.scene.tweens.add({
        targets:  this._nuggetCircle,
        scaleX:   1.3,
        scaleY:   1.3,
        duration: 120,
        ease:     'Quad.easeOut',
      });
    }

    // One-shot 20 ambush damage — the trap pays off immediately on reveal
    if (!this._revealDamageDealt) {
      this._revealDamageDealt = true;
      player.takeDamage(20);
    }

    // Four white teeth snap inward from N/S/E/W edges toward center
    // Each entry: [startX, startY, endX, endY, v0x, v0y, v1x, v1y, v2x, v2y]
    // Vertices define a fang shape pointing inward from the given edge
    const teethDefs: Array<{
      sx: number; sy: number; ex: number; ey: number;
      x1: number; y1: number; x2: number; y2: number; x3: number; y3: number;
    }> = [
      // Top — downward-pointing fang
      { sx:   0, sy: -20, ex:  0, ey: -7,  x1: -5, y1: -5, x2:  5, y2: -5, x3:  0, y3:  5 },
      // Bottom — upward-pointing fang
      { sx:   0, sy:  20, ex:  0, ey:  7,  x1: -5, y1:  5, x2:  5, y2:  5, x3:  0, y3: -5 },
      // Left — rightward-pointing fang
      { sx: -20, sy:   0, ex: -7, ey:  0,  x1: -5, y1: -5, x2: -5, y2:  5, x3:  5, y3:  0 },
      // Right — leftward-pointing fang
      { sx:  20, sy:   0, ex:  7, ey:  0,  x1:  5, y1: -5, x2:  5, y2:  5, x3: -5, y3:  0 },
    ];

    this._revealTeeth = [];
    for (const t of teethDefs) {
      const tooth = this.scene.add.triangle(0, 0, t.x1, t.y1, t.x2, t.y2, t.x3, t.y3, 0xffffff);
      tooth.setPosition(t.sx, t.sy);
      this.visual.add(tooth);
      this._revealTeeth.push(tooth);

      // Snap toward center after the scale burst completes
      this.scene.tweens.add({
        targets:  tooth,
        x:        t.ex,
        y:        t.ey,
        delay:    120,
        duration: 200,
        ease:     'Quad.easeIn',
      });
    }
  }

  private enterHunt(): void {
    this._gaslightState = GaslightState.HUNT;

    // Discard reveal teeth references (container.removeAll below destroys the GameObjects)
    this._revealTeeth  = [];
    this._nuggetCircle = null;

    // Rebuild container entirely for HUNT appearance
    this.visual.removeAll(true);
    this.visual.setDepth(2);

    // Rotten nugget body — same shape, darkened color
    const nugget = this.scene.add.circle(0, 0, 12, ROTTEN_COLOR);
    this.visual.add(nugget);

    // Four outward-pointing white teeth — permanent after unmasking
    const huntTeethDefs: Array<{
      x: number; y: number;
      x1: number; y1: number; x2: number; y2: number; x3: number; y3: number;
    }> = [
      // Top — points up (outward)
      { x:   0, y: -16,  x1: -5, y1:  5, x2:  5, y2:  5, x3:  0, y3: -5 },
      // Bottom — points down
      { x:   0, y:  16,  x1: -5, y1: -5, x2:  5, y2: -5, x3:  0, y3:  5 },
      // Left — points left
      { x: -16, y:   0,  x1:  5, y1: -5, x2:  5, y2:  5, x3: -5, y3:  0 },
      // Right — points right
      { x:  16, y:   0,  x1: -5, y1: -5, x2: -5, y2:  5, x3:  5, y3:  0 },
    ];
    for (const t of huntTeethDefs) {
      const tooth = this.scene.add.triangle(0, 0, t.x1, t.y1, t.x2, t.y2, t.x3, t.y3, 0xffffff);
      tooth.setPosition(t.x, t.y);
      this.visual.add(tooth);
    }

    // Two red eyes
    const eyeL = this.scene.add.circle(-6, -4, 2, 0xff3333);
    const eyeR = this.scene.add.circle( 6, -4, 2, 0xff3333);
    this.visual.add([eyeL, eyeR]);

    // Unfreeze physics — Gaslight is now a chaser
    const physBody = this.carrier.body as Phaser.Physics.Arcade.Body;
    physBody.setImmovable(false);
    physBody.setVelocity(0, 0);
  }

  // ── AI ───────────────────────────────────────────────────────────────────────

  protected updateAI(
    _time:  number,
    delta:  number,
    player: Player,
    _room:  Room,
  ): void {
    // Drive the base-class state label to show the Gaslight-specific state string
    this.state = this._gaslightState as unknown as AIState;

    switch (this._gaslightState) {
      case GaslightState.DISGUISED: {
        (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        // Proximity check — 40px matches the player's typical pickup radius for floor loot
        const dx     = player.getX() - this.carrier.x;
        const dy     = player.getY() - this.carrier.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < TRIGGER_RADIUS * TRIGGER_RADIUS) {
          this.enterReveal(player);
        }
        break;
      }

      case GaslightState.REVEAL: {
        (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this._revealTimer += delta;
        if (this._revealTimer >= REVEAL_MS) {
          this.enterHunt();
        }
        break;
      }

      case GaslightState.HUNT: {
        const physBody = this.carrier.body as Phaser.Physics.Arcade.Body;
        const dx       = player.getX() - this.carrier.x;
        const dy       = player.getY() - this.carrier.y;
        const len      = Math.sqrt(dx * dx + dy * dy) || 1;
        physBody.setVelocity((dx / len) * HUNT_SPEED, (dy / len) * HUNT_SPEED);
        break;
      }
    }
  }
}
