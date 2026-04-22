// TechnicalDebt — accumulator enemy. Starts trivial (small, slow, fragile).
// Every 5 seconds uninterrupted, it gains a new debt layer: extra HP stacked
// onto whatever it has left, more speed, higher contact damage, and a new ring
// of visual cruft around the core. Three layers maximum. Kill it in layer 0
// and it's a non-issue. Ignore it while handling other threats and you'll find
// a fast, tanky, high-damage wall waiting for you. The lesson: pay down your
// debt early, or compound interest does it for you.

import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

// 5 seconds per accumulation cycle — long enough to feel like a real choice
const LAYER_INTERVAL = 5000;
const MAX_LAYERS     = 3;

interface DebtLayerConfig {
  hp:            number;  // added to current HP on accumulation (not a full reset)
  speed:         number;
  contactDamage: number;
  size:          number;  // rectangle side length for this layer's visual ring
  color:         number;
}

// Each layer represents escalating negligence — grey to red
const LAYER_DATA: DebtLayerConfig[] = [
  { hp:  20, speed:  35, contactDamage:  5, size: 18, color: 0x888888 }, // layer 0: clean slate
  { hp:  25, speed:  60, contactDamage: 10, size: 24, color: 0xbbbb22 }, // layer 1: first warning
  { hp:  35, speed:  85, contactDamage: 15, size: 30, color: 0xcc6622 }, // layer 2: past due
  { hp:  50, speed: 110, contactDamage: 22, size: 36, color: 0xff2222 }, // layer 3: critical
];

export default class TechnicalDebt extends Enemy {
  private _debtLayer             = 0;
  private _accumTimer            = 0;
  private _currentSpeed:         number;
  private _currentContactDamage: number;
  // Tracks visual ring rectangles so buildVisual can reason about the stack
  private _layerRects: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            LAYER_DATA[0].hp,
      speed:         LAYER_DATA[0].speed,  // base value; overridden at runtime
      contactDamage: 0,                    // runtime value via getContactDamage()
      hitboxW:       36,
      hitboxH:       36,
    });
    this._currentSpeed         = LAYER_DATA[0].speed;
    this._currentContactDamage = LAYER_DATA[0].contactDamage;
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  override getContactDamage(): number {
    return this._currentContactDamage;
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Reset accumulation state — handles both initial construction and post-respawn
    this._debtLayer             = 0;
    this._accumTimer            = 0;
    this._currentSpeed          = LAYER_DATA[0].speed;
    this._currentContactDamage  = LAYER_DATA[0].contactDamage;
    this._layerRects            = [];

    container.setScale(1.0);

    // Seed the base layer visual
    this._addLayerRect(container, 0);
  }

  // Adds one visual rectangle ring for the given layer index.
  // New rings are inserted behind existing ones (addAt index 0) so the
  // smaller core layers stay visible above the growing outer cruft.
  private _addLayerRect(
    container: Phaser.GameObjects.Container,
    layer:     number,
  ): void {
    const cfg  = LAYER_DATA[layer];
    const rect = this.scene.add.rectangle(0, 0, cfg.size, cfg.size, cfg.color);
    // Each successive layer is rotated 10° more than the previous —
    // visual chaos that reads immediately as "this is getting out of hand"
    rect.setRotation((layer * Math.PI) / 18);
    rect.setStrokeStyle(1, 0x000000);
    this._layerRects.push(rect);
    // addAt(0) places this rect at the bottom of the draw order —
    // behind all existing layers so the original core stays on top
    container.addAt(rect, 0);
  }

  private _accumulateDebt(): void {
    this._debtLayer++;
    this._accumTimer = 0;

    const cfg = LAYER_DATA[this._debtLayer];
    this._currentSpeed         = cfg.speed;
    this._currentContactDamage = cfg.contactDamage;

    // Stack HP on top of whatever the player has left, not a full refill —
    // hurting it first then walking away still rewards partial effort
    this.hp += cfg.hp;

    this._addLayerRect(this.visual, this._debtLayer);

    // Surge pulse: the whole enemy briefly swells to signal the accumulation
    this.scene.tweens.add({
      targets:  this.visual,
      scaleX:   1.35,
      scaleY:   1.35,
      duration: 120,
      yoyo:     true,
      ease:     'Quad.easeOut',
    });
  }

  protected updateAI(
    _time:  number,
    delta:  number,
    player: Player,
    _room:  Room,
  ): void {
    // Debug label shows current debt layer so playtesting is readable
    this.state = `debt:layer(${this._debtLayer}/${MAX_LAYERS})` as unknown as AIState;

    // Always chasing — TechnicalDebt never retreats, never waits, never stops
    const dx  = player.getX() - this.carrier.x;
    const dy  = player.getY() - this.carrier.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(
      (dx / len) * this._currentSpeed,
      (dy / len) * this._currentSpeed,
    );

    // Accumulate debt if not yet at maximum layers
    if (this._debtLayer < MAX_LAYERS) {
      this._accumTimer += delta;
      if (this._accumTimer >= LAYER_INTERVAL) {
        this._accumulateDebt();
      }
    }
  }
}
