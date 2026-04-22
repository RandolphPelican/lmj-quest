// Hallucination — phaser-type enemy that cycles between SOLID (damageable,
// damaging) and INTANGIBLE (untouchable, harmless) on a 2s/2s rhythm.
// On every phase flip, teleports 40px in a random cardinal direction.
// The fight is a rhythm puzzle: read the cycle, hold fire during INTANGIBLE,
// strike during the 2s SOLID windows. Panic-swingers waste their hits on air.
// The last 400ms of SOLID flickers as a telegraph; observant players use it.

import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import {
  PLAYFIELD_X,
  PLAYFIELD_Y,
  ROOM_PIXEL_WIDTH,
  ROOM_PIXEL_HEIGHT,
} from '../../shared/tiles';
import type { Player } from '../Player';
import type { Room } from '../Room';

const MOVE_SPEED        = 70;
const SOLID_DURATION    = 2000;   // ms
const INTANGIBLE_DURATION = 2000; // ms
const FLICKER_START     = 400;    // ms before phase-out to begin alpha flicker telegraph
const TELEPORT_DIST     = 40;     // px cardinal teleport on every phase flip
const EDGE_MARGIN       = 24;     // px — keep carrier this far from playfield edges after teleport

enum HallucinationState {
  SOLID      = 'halluc:solid',
  INTANGIBLE = 'halluc:phase',
}

export default class Hallucination extends Enemy {
  private _halState:    HallucinationState = HallucinationState.SOLID;
  private _phaseTimer   = 0;
  private _diamond:     Phaser.GameObjects.Rectangle | null = null;
  private _flickerTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            30,
      speed:         MOVE_SPEED,
      contactDamage: 0,  // runtime value supplied by getContactDamage() override
      hitboxW:       28,
      hitboxH:       28,
    });
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  // Returns contact damage only while SOLID — belt-and-suspenders alongside checkCollision.none
  override getContactDamage(): number {
    return this._halState === HallucinationState.SOLID ? 10 : 0;
  }

  // Blocks incoming damage during INTANGIBLE; spawns a visual ping to give feedback
  override takeDamage(amount: number, knockbackDir?: { x: number; y: number }): void {
    if (this._halState === HallucinationState.INTANGIBLE) {
      // "Your hit didn't land" ping — small white burst at impact point
      const ping = this.scene.add.circle(this.getX(), this.getY(), 8, 0xffffff);
      ping.setDepth(5);
      this.scene.tweens.add({
        targets:    ping,
        alpha:      0,
        scaleX:     2.5,
        scaleY:     2.5,
        duration:   200,
        ease:       'Quad.easeOut',
        onComplete: () => ping.destroy(),
      });
      return;
    }
    super.takeDamage(amount, knockbackDir);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Reset all state — handles initial construction and post-respawn rebuild
    if (this._flickerTween) {
      this._flickerTween.stop();
      this._flickerTween = null;
    }
    this._halState   = HallucinationState.SOLID;
    this._phaseTimer = 0;
    this._diamond    = null;

    // Restore SOLID physics on the newly created carrier
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.none = false;

    // Diamond: rotated square with grey outline
    const diamond = this.scene.add.rectangle(0, 0, 32, 32, 0xffffff);
    diamond.setRotation(Math.PI / 4);
    diamond.setStrokeStyle(1, 0x888888);
    this._diamond = diamond;

    // Black center dot
    const dot = this.scene.add.circle(0, 0, 3, 0x000000);

    container.add([diamond, dot]);
    container.setAlpha(1.0);
    container.setScale(1.0);
  }

  // ── Phase transitions ────────────────────────────────────────────────────────

  private _transitionToIntangible(): void {
    this._halState   = HallucinationState.INTANGIBLE;
    this._phaseTimer = 0;

    if (this._flickerTween) {
      this._flickerTween.stop();
      this._flickerTween = null;
    }

    // Cold blue tint for intangible state
    this._diamond?.setFillStyle(0xaaccff);

    // Disable collision checks — enemy passes through walls and player hitboxes,
    // but body.enable stays true so velocity still drives movement
    (this.carrier.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;

    this._teleportAndReveal(0.25);
  }

  private _transitionToSolid(): void {
    this._halState   = HallucinationState.SOLID;
    this._phaseTimer = 0;

    // Restore white
    this._diamond?.setFillStyle(0xffffff);

    // Restore full collision participation
    (this.carrier.body as Phaser.Physics.Arcade.Body).checkCollision.none = false;

    this._teleportAndReveal(1.0);
  }

  private _teleportAndReveal(targetAlpha: number): void {
    // Pick a random cardinal direction
    const cardinals: { x: number; y: number }[] = [
      { x:            0, y: -TELEPORT_DIST },  // N
      { x:            0, y:  TELEPORT_DIST },  // S
      { x: -TELEPORT_DIST, y:           0 },  // W
      { x:  TELEPORT_DIST, y:           0 },  // E
    ];
    const dir = cardinals[Math.floor(Math.random() * 4)];

    // Clamp to playfield bounds so the enemy can't teleport into an inaccessible corner
    const newX = Phaser.Math.Clamp(
      this.carrier.x + dir.x,
      PLAYFIELD_X + EDGE_MARGIN,
      PLAYFIELD_X + ROOM_PIXEL_WIDTH  - EDGE_MARGIN,
    );
    const newY = Phaser.Math.Clamp(
      this.carrier.y + dir.y,
      PLAYFIELD_Y + EDGE_MARGIN,
      PLAYFIELD_Y + ROOM_PIXEL_HEIGHT - EDGE_MARGIN,
    );

    // Snap carrier and visual to new position — visual teleports invisibly, then fades in
    this.carrier.setPosition(newX, newY);
    this.visual.setPosition(newX, newY);

    // Pop reveal: alpha 0 → targetAlpha, scale 0.8 → 1.0 over 120ms
    this.visual.setAlpha(0);
    this.visual.setScale(0.8);
    this.scene.tweens.add({
      targets:  this.visual,
      alpha:    targetAlpha,
      scaleX:   1.0,
      scaleY:   1.0,
      duration: 120,
      ease:     'Quad.easeOut',
    });
  }

  // ── AI ───────────────────────────────────────────────────────────────────────

  protected updateAI(
    _time:  number,
    delta:  number,
    player: Player,
    _room:  Room,
  ): void {
    // Safety: don't process phase logic after death
    if (this.isDead()) return;

    this.state = this._halState as unknown as AIState;

    // Both states drift toward the player at the same speed
    const dx  = player.getX() - this.carrier.x;
    const dy  = player.getY() - this.carrier.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(
      (dx / len) * MOVE_SPEED,
      (dy / len) * MOVE_SPEED,
    );

    this._phaseTimer += delta;

    if (this._halState === HallucinationState.SOLID) {
      // Start flicker telegraph in the last 400ms before phase-out
      if (this._phaseTimer >= SOLID_DURATION - FLICKER_START && !this._flickerTween) {
        this._flickerTween = this.scene.tweens.add({
          targets:  this.visual,
          alpha:    0.6,
          duration: 100,
          yoyo:     true,
          repeat:   -1,
          ease:     'Linear',
        });
      }
      if (this._phaseTimer >= SOLID_DURATION) {
        this._transitionToIntangible();
      }
    } else {
      // INTANGIBLE
      if (this._phaseTimer >= INTANGIBLE_DURATION) {
        this._transitionToSolid();
      }
    }
  }
}
