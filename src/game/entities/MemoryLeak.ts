// MemoryLeak — summoner enemy. Stationary factory that births small fragment
// chasers every 4 seconds up to a live cap of 3. Killing the parent stops all
// future spawns; fragments already alive continue independently. Classic
// priority-target design: kill the source or clean up forever.

// MemoryLeak spawns fragments via the 'enemy:spawnMemoryFragment' scene event.
// GameScene will need to listen for this event and instantiate a MemoryFragment
// in the correct room's enemy map when wiring happens. Pattern mirrors the
// existing 'enemy:spawnForkBombJr' handler — copy that handler's shape.
// Also: GameScene must ensure 'enemy:memoryFragmentDied' is emitted from
// fragment death cleanup if fragments die via room-exit cleanup (not just
// player damage) — otherwise the parent's counter will leak. One-line fix
// in the room-cleanup path; flag it when wiring.

import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const PARENT_HP        = 55;
const FRAGMENT_HP      = 8;
const FRAGMENT_SPEED   = 130;
// Summon interval and cap define the core pressure curve: patient players
// can kill the parent before 3 fragments pile up; panicked ones get overwhelmed
const SUMMON_INTERVAL  = 4000;  // ms between fragment spawns
const FRAGMENT_CAP     = 3;     // maximum simultaneous live fragments per parent

type FragmentDiedPayload = { parentId: string };
type SpawnFragmentPayload = { x: number; y: number; parentId: string };

// ── MemoryLeak (parent) ──────────────────────────────────────────────────────

export default class MemoryLeak extends Enemy {
  private _liveFragments   = 0;
  private _summonTimer     = 0;
  private _centerDot: Phaser.GameObjects.Arc | null = null;

  private readonly _parentId: string;
  private readonly _onFragmentDied: (data: FragmentDiedPayload) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            PARENT_HP,
      speed:         0,
      contactDamage: 6,
      hitboxW:       40,
      hitboxH:       40,
    });

    // Stable identity string derived from spawn tile coordinates
    this._parentId = `${x},${y}`;

    // Bound listener — stored so it can be removed on forceDestroy
    this._onFragmentDied = (data: FragmentDiedPayload) => {
      if (data.parentId === this._parentId) {
        this._liveFragments = Math.max(0, this._liveFragments - 1);
      }
    };
    scene.events.on('enemy:memoryFragmentDied', this._onFragmentDied);

    (this.carrier.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  override forceDestroy(): void {
    this.scene.events.off('enemy:memoryFragmentDied', this._onFragmentDied);
    super.forceDestroy();
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Reset summoning state — also handles post-respawn rebuild
    this._liveFragments = 0;
    this._summonTimer   = 0;
    this._centerDot     = null;

    const body = this.carrier.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setVelocity(0, 0);

    // Main body: dark swamp green with black outline
    const mainBody = this.scene.add.circle(0, 0, 22, 0x2a5a2a);
    mainBody.setStrokeStyle(2, 0x000000);

    // Inner blob: pulses 1.0 → 1.2 → 1.0 over 2000ms (heartbeat)
    const innerBlob = this.scene.add.circle(0, 0, 12, 0x4a8a4a);
    this.scene.tweens.add({
      targets:  innerBlob,
      scaleX:   1.2,
      scaleY:   1.2,
      duration: 1000,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // Four satellite dots at NE/NW/SE/SW — 14px diagonal distance from center
    const off = 14 / Math.SQRT2; // ~9.9px per axis to place dots exactly 14px out
    const ne = this.scene.add.circle( off, -off, 4, 0x1a3a1a);
    const nw = this.scene.add.circle(-off, -off, 4, 0x1a3a1a);
    const se = this.scene.add.circle( off,  off, 4, 0x1a3a1a);
    const sw = this.scene.add.circle(-off,  off, 4, 0x1a3a1a);

    // Center dot: brightness telegraphs the summon cycle; flashes on spawn
    const centerDot = this.scene.add.circle(0, 0, 2, 0xffff88);
    this._centerDot = centerDot;

    container.add([mainBody, innerBlob, ne, nw, se, sw, centerDot]);
  }

  protected updateAI(
    _time:   number,
    delta:   number,
    _player: Player,
    _room:   Room,
  ): void {
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // Debug label shows live fragment count against the cap
    this.state = `memoryLeak:summoning(${this._liveFragments}/${FRAGMENT_CAP})` as unknown as AIState;

    this._summonTimer += delta;

    if (this._summonTimer >= SUMMON_INTERVAL) {
      if (this._liveFragments < FRAGMENT_CAP) {
        this._liveFragments++;
        this._summonTimer = 0;

        // Flash the center dot to telegraph the spawn to observant players
        if (this._centerDot) {
          this.scene.tweens.add({
            targets:  this._centerDot,
            scaleX:   2.5,
            scaleY:   2.5,
            duration: 120,
            yoyo:     true,
            ease:     'Quad.easeOut',
          });
        }

        const payload: SpawnFragmentPayload = {
          x:        this.getX(),
          y:        this.getY(),
          parentId: this._parentId,
        };
        this.scene.events.emit('enemy:spawnMemoryFragment', payload);
      }
      // Cap reached: keep timer pegged at max so the next spawn fires
      // immediately once a fragment dies and the counter drops below cap
    }
  }
}

// ── MemoryFragment (child) ───────────────────────────────────────────────────

export class MemoryFragment extends Enemy {
  private readonly _parentId: string;
  private readonly _trailTimer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, parentId: string) {
    super(scene, x, y, {
      hp:            FRAGMENT_HP,
      speed:         FRAGMENT_SPEED,
      contactDamage: 4,
      hitboxW:       14,
      hitboxH:       14,
    });

    this._parentId = parentId;
    this.buildVisual(this.visual);

    // Trailing green ghost dots — fires every 120ms for the duration of the fragment's life
    this._trailTimer = scene.time.addEvent({
      delay:         120,
      callback:      this._spawnTrail,
      callbackScope: this,
      loop:          true,
    });
  }

  override forceDestroy(): void {
    // Stop trail timer before base cleanup to prevent stale spawns after destruction
    this._trailTimer.destroy();
    super.forceDestroy();
  }

  override takeDamage(amount: number, knockbackDir?: { x: number; y: number }): void {
    const wasDead = this.isDead();
    super.takeDamage(amount, knockbackDir);
    // Notify parent to decrement its live-fragment counter
    if (!wasDead && this.isDead()) {
      const payload: FragmentDiedPayload = { parentId: this._parentId };
      this.scene.events.emit('enemy:memoryFragmentDied', payload);
    }
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    // Matches the parent's inner blob color — visually "made of the same stuff"
    const circle = this.scene.add.circle(0, 0, 6, 0x4a8a4a);
    container.add(circle);
  }

  private _spawnTrail(): void {
    if (this.isDead()) {
      this._trailTimer.destroy();
      return;
    }
    const dot = this.scene.add.circle(this.getX(), this.getY(), 4, 0x4a8a4a, 0.5);
    dot.setDepth(1);
    this.scene.tweens.add({
      targets:    dot,
      alpha:      0,
      duration:   300,
      ease:       'Linear',
      onComplete: () => dot.destroy(),
    });
  }

  protected updateAI(
    _time:  number,
    _delta: number,
    player: Player,
    _room:  Room,
  ): void {
    const dx  = player.getX() - this.carrier.x;
    const dy  = player.getY() - this.carrier.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    (this.carrier.body as Phaser.Physics.Arcade.Body).setVelocity(
      (dx / len) * FRAGMENT_SPEED,
      (dy / len) * FRAGMENT_SPEED,
    );
    this.state = 'fragment:chase' as unknown as AIState;
  }
}
