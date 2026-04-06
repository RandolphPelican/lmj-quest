import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/tiles';
import { Enemy, AIState } from './Enemy';
import type { Player } from '../Player';
import type { Room } from '../Room';

const ATTACK_RANGE  = 120; // px — triggers lunge
const LUNGE_SPEED   = 180;
const LUNGE_DURATION = 800; // ms

export class StackOverflow extends Enemy {
  private readonly homePos!: { x: number; y: number };
  private readonly patrolCorners!: { x: number; y: number }[];
  private patrolIndex = 0;
  private attackTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      hp: 100,
      speed: 60,
      contactDamage: 15,
      hitboxW: 24,
      hitboxH: 32,
    });
    this.homePos = { x, y };
    this.patrolCorners = [
      { x: x - TILE_SIZE * 2, y: y - TILE_SIZE },
      { x: x + TILE_SIZE * 2, y: y - TILE_SIZE },
      { x: x + TILE_SIZE * 2, y: y + TILE_SIZE },
      { x: x - TILE_SIZE * 2, y: y + TILE_SIZE },
    ];
    this.state = AIState.Patrolling;
    this.buildVisual(this.visual);
  }

  protected buildVisual(container: Phaser.GameObjects.Container): void {
    const block1 = this.scene.add.rectangle(-4, -14, 22, 11, 0x22aa44);
    const block2 = this.scene.add.rectangle( 2,  -2, 22, 11, 0x33cc55);
    const block3 = this.scene.add.rectangle(-2,  10, 22, 11, 0x22aa44);
    const eyeL   = this.scene.add.circle(-3, -14, 2, 0xff4444);
    const eyeR   = this.scene.add.circle( 5, -14, 2, 0xff4444);
    container.add([block1, block2, block3, eyeL, eyeR]);
  }

  protected updateAI(
    _time: number,
    delta: number,
    player: Player,
    _room: Room,
  ): void {
    const dx           = player.getX() - this.carrier.x;
    const dy           = player.getY() - this.carrier.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    const body         = this.carrier.body as Phaser.Physics.Arcade.Body;

    if (this.state === AIState.Patrolling) {
      if (distToPlayer < ATTACK_RANGE) {
        // Begin lunge
        this.state       = AIState.Attacking;
        this.attackTimer = LUNGE_DURATION;
        const len = distToPlayer || 1;
        body.setVelocity((dx / len) * LUNGE_SPEED, (dy / len) * LUNGE_SPEED);
        return;
      }

      // Move to next patrol corner
      const target = this.patrolCorners[this.patrolIndex];
      const tdx    = target.x - this.carrier.x;
      const tdy    = target.y - this.carrier.y;
      const tdist  = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist < 8) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolCorners.length;
      } else {
        const tlen = tdist || 1;
        body.setVelocity((tdx / tlen) * this.speed, (tdy / tlen) * this.speed);
      }

    } else if (this.state === AIState.Attacking) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.state = AIState.Returning;
        body.setVelocity(0, 0);
      }
      // Lunge velocity stays; wall collider stops it naturally

    } else if (this.state === AIState.Returning) {
      const tdx   = this.homePos.x - this.carrier.x;
      const tdy   = this.homePos.y - this.carrier.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist < 8) {
        this.state = AIState.Patrolling;
        body.setVelocity(0, 0);
      } else {
        const tlen = tdist || 1;
        body.setVelocity((tdx / tlen) * this.speed, (tdy / tlen) * this.speed);
      }
    }
  }
}
