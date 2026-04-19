import Phaser from 'phaser';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

type SegPhase = 'idle' | 'windup' | 'charge' | 'recover';

const IDLE_DURATION    = 1500;
const WINDUP_DURATION  = 1000;
const RECOVER_DURATION = 600;
const CHARGE_SPEED     = 500;
const MAX_CHARGE_DIST  = 400;
const CHARGE_DAMAGE    = 25;

export class SegFault extends Enemy {
  private phase: SegPhase = 'idle';
  private phaseTimer = 0;
  private chargeDir  = { x: 0, y: 1 };
  private chargeStartX = 0;
  private chargeStartY = 0;
  private isCharging   = false;

  private bodyRect!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp:            50,
      speed:         0,
      contactDamage: 0, // overridden below
      hitboxW:       32,
      hitboxH:       32,
    });
    this.buildVisual(this.visual);
    this.visual.setDepth(2);
  }

  override getContactDamage(): number {
    return this.isCharging ? CHARGE_DAMAGE : 0;
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    this.bodyRect = this.scene.add.rectangle(0, 0, 36, 36, 0x8b0000);
    const eyeL    = this.scene.add.circle(-10, 0, 3, 0xff3333);
    const eyeR    = this.scene.add.circle( 10, 0, 3, 0xff3333);
    container.add([this.bodyRect, eyeL, eyeR]);
  }

  private enterPhase(phase: SegPhase, player?: Player): void {
    this.phase      = phase;
    this.phaseTimer = 0;
    const body      = this.carrier.body as Phaser.Physics.Arcade.Body;

    if (phase === 'idle') {
      this.isCharging = false;
      body.setVelocity(0, 0);
    }

    if (phase === 'windup' && player) {
      this.isCharging = false;
      body.setVelocity(0, 0);
      const dx = player.getX() - this.carrier.x;
      const dy = player.getY() - this.carrier.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.chargeDir = { x: dx / len, y: dy / len };

      this.scene.tweens.add({
        targets:  this.bodyRect,
        scaleX:   1.6,
        scaleY:   0.6,
        duration: 800,
        ease:     'Sine.easeInOut',
      });
    }

    if (phase === 'charge') {
      this.isCharging  = true;
      this.chargeStartX = this.carrier.x;
      this.chargeStartY = this.carrier.y;
      body.setVelocity(this.chargeDir.x * CHARGE_SPEED, this.chargeDir.y * CHARGE_SPEED);

      this.scene.tweens.add({
        targets:  this.bodyRect,
        scaleX:   0.5,
        scaleY:   1.5,
        duration: 50,
      });
    }

    if (phase === 'recover') {
      this.isCharging = false;
      body.setVelocity(0, 0);
      this.scene.tweens.add({
        targets:  this.bodyRect,
        scaleX:   1,
        scaleY:   1,
        duration: RECOVER_DURATION,
        ease:     'Sine.easeOut',
      });
    }
  }

  protected updateAI(
    _time:  number,
    delta:  number,
    player: Player,
    _room:  Room,
  ): void {
    this.phaseTimer += delta;
    const body = this.carrier.body as Phaser.Physics.Arcade.Body;

    switch (this.phase) {
      case 'idle':
        this.state = AIState.Idle;
        body.setVelocity(0, 0);
        if (this.phaseTimer >= IDLE_DURATION) this.enterPhase('windup', player);
        break;

      case 'windup':
        this.state = AIState.Attacking;
        body.setVelocity(0, 0);
        if (this.phaseTimer >= WINDUP_DURATION) this.enterPhase('charge');
        break;

      case 'charge': {
        this.state = AIState.Chasing;
        const dx       = this.carrier.x - this.chargeStartX;
        const dy       = this.carrier.y - this.chargeStartY;
        const traveled = Math.sqrt(dx * dx + dy * dy);
        const blocked  = body.blocked.left || body.blocked.right
                      || body.blocked.up   || body.blocked.down;
        if (traveled > MAX_CHARGE_DIST || blocked) {
          this.enterPhase('recover');
        }
        break;
      }

      case 'recover':
        this.state = AIState.Idle;
        body.setVelocity(0, 0);
        if (this.phaseTimer >= RECOVER_DURATION) this.enterPhase('idle');
        break;
    }
  }
}
