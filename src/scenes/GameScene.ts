import Phaser from 'phaser';
import {
  TILE_SIZE,
  ROOM_HEIGHT_TILES,
  ROOM_PIXEL_WIDTH,
  TileFlag,
} from '../shared/tiles';
import { ALL_ROOMS } from '../shared/rooms';
import type { RoomData, DoorTarget } from '../shared/rooms';
import { Room } from '../game/Room';
import { Player, type WASDKeys } from '../game/Player';
import { HUD } from '../game/HUD';
import { DebugOverlay } from '../game/DebugOverlay';
import type { Enemy } from '../game/entities/Enemy';
import { NullPointer } from '../game/entities/NullPointer';
import { StackOverflow } from '../game/entities/StackOverflow';
import { InfiniteLoop } from '../game/entities/InfiniteLoop';
import { EnemyProjectile } from '../game/entities/EnemyProjectile';
import type { CharacterDefinition } from '../shared/characters';

const HUD_HEIGHT  = 80;
const CANVAS_W    = 800;
const PLAYFIELD_X = (CANVAS_W - ROOM_PIXEL_WIDTH) / 2;  // 160
const PLAYFIELD_Y = HUD_HEIGHT;                          // 80

type SlideDir = 'north' | 'south' | 'east' | 'west';

type SpawnProjectileData = {
  x: number; y: number;
  dirX: number; dirY: number;
  damage: number;
};

export class GameScene extends Phaser.Scene {
  private selectedCharacter!: CharacterDefinition;

  private player!: Player;
  private hud!: HUD;
  private debugOverlay!: DebugOverlay;

  private currentRoom!: Room;
  private currentCollider!: Phaser.Physics.Arcade.Collider;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASDKeys;
  private f1Key!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private jKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;

  private transitioning = false;
  private readonly triggeredPlates = new Set<string>();

  private readonly enemyMap = new Map<string, Enemy[]>();
  private activeProjectiles: EnemyProjectile[] = [];
  private aiDebugOn = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { character: CharacterDefinition }): void {
    this.selectedCharacter = data.character;
    this.triggeredPlates.clear();
    this.transitioning = false;
    this.aiDebugOn = false;
    this.enemyMap.clear();
    this.activeProjectiles = [];
  }

  create(): void {
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.f1Key    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.f1Key.on('down', () => {
      if (this.shiftKey.isDown) {
        this.aiDebugOn = !this.aiDebugOn;
        this.events.emit('enemy:setDebugMode', this.aiDebugOn);
      } else {
        this.debugOverlay.toggle();
      }
    });

    this.jKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.pKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.hud          = new HUD(this, this.selectedCharacter);
    this.debugOverlay = new DebugOverlay(this);

    // Wire enemy respawn: re-attach wall collider if enemy is in the current room
    this.events.on('enemy:respawned', (enemy: Enemy) => {
      const currentRoomEnemies = this.enemyMap.get(this.currentRoom.roomData.id) ?? [];
      if (currentRoomEnemies.includes(enemy)) {
        enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
      } else {
        enemy.setVisualVisible(false);
      }
    });

    // Wire projectile spawning (fired by InfiniteLoop)
    this.events.on('enemy:spawnProjectile', (data: SpawnProjectileData) => {
      this.activeProjectiles.push(
        new EnemyProjectile(this, data.x, data.y, data.dirX, data.dirY, data.damage),
      );
    });

    this.loadRoom(ALL_ROOMS['room_01'], { x: 7, y: 5 });
  }

  update(time: number, delta: number): void {
    if (this.transitioning) return;

    const px    = this.player.getX();
    const py    = this.player.getY();
    const flags = this.currentRoom.getFlagsAt(px, py);

    this.player.applyTerrainEffect(flags);
    this.player.update(this.cursors, this.wasd);

    // ── Combat input ──────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.jKey)) this.player.trySwingSword();
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) this.player.tryShieldBash();

    const currentEnemies = this.enemyMap.get(this.currentRoom.roomData.id) ?? [];

    // ── Enemy updates ─────────────────────────────────────────────────────────
    for (const enemy of currentEnemies) {
      enemy.update(time, delta, this.player, this.currentRoom);
    }

    // ── Sword hit detection ───────────────────────────────────────────────────
    const swordHitbox = this.player.getSwordHitbox();
    if (swordHitbox && !this.player.isSwordHitConnected()) {
      for (const enemy of currentEnemies) {
        if (!enemy.isDead() && this.aabbOverlap(swordHitbox, enemy.getPhysicsCarrier())) {
          this.player.markSwordHitConnected();
          const dx  = enemy.getX() - this.player.getX();
          const dy  = enemy.getY() - this.player.getY();
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.takeDamage(20, { x: dx / len, y: dy / len });
          break;
        }
      }
    }

    // ── Bash hit detection ────────────────────────────────────────────────────
    const bashHitbox = this.player.getBashHitbox();
    if (bashHitbox && !this.player.isBashHitConnected()) {
      for (const enemy of currentEnemies) {
        if (!enemy.isDead() && this.aabbOverlap(bashHitbox, enemy.getPhysicsCarrier())) {
          this.player.markBashHitConnected();
          const dx  = enemy.getX() - this.player.getX();
          const dy  = enemy.getY() - this.player.getY();
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.takeDamage(15, { x: dx / len, y: dy / len });
          break;
        }
      }
    }

    // ── Contact damage (enemy → player) ───────────────────────────────────────
    if (!this.player.isInvincible() && !this.player.isDead()) {
      for (const enemy of currentEnemies) {
        if (!enemy.isDead()) {
          if (this.aabbOverlap(this.player.getPhysicsObject(), enemy.getPhysicsCarrier())) {
            this.player.takeDamage(enemy.getContactDamage());
            if (this.player.isDead()) {
              this.transitioning = true;
              return;
            }
            break;
          }
        }
      }
    }

    // ── Projectile updates & overlap ──────────────────────────────────────────
    this.activeProjectiles = this.activeProjectiles.filter(p => p.isAlive());
    for (const proj of this.activeProjectiles) {
      proj.update();
      if (!this.player.isInvincible() && !this.player.isDead()) {
        if (this.aabbOverlap(proj.getPhysicsCarrier(), this.player.getPhysicsObject())) {
          const dmg = proj.getDamage();
          proj.destroy();
          this.player.takeDamage(dmg);
          if (this.player.isDead()) {
            this.transitioning = true;
            return;
          }
        }
      }
    }

    // ── Tile checks ───────────────────────────────────────────────────────────
    const tx = this.player.getTileX();
    const ty = this.player.getTileY();

    const door = this.currentRoom.getDoorAt(tx, ty);
    if (door) {
      this.startTransition(door, this.slideDir(tx, ty));
      return;
    }

    if (flags & TileFlag.PressurePlate) {
      const key = `${tx},${ty}`;
      if (!this.triggeredPlates.has(key)) {
        this.triggeredPlates.add(key);
        this.activatePressurePlate(tx, ty);
      }
    }

    // ── HUD update ────────────────────────────────────────────────────────────
    this.hud.setHP(this.player.getHP(), this.player.getMaxHP());
    this.hud.setMP(this.player.getMP(), this.player.getMaxMP());

    this.debugOverlay.update(this.player, this.currentRoom, currentEnemies);
  }

  // ── Room loading ─────────────────────────────────────────────────────────────

  private loadRoom(roomData: RoomData, spawnTile: { x: number; y: number }): void {
    const spawnX = PLAYFIELD_X + spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = PLAYFIELD_Y + spawnTile.y * TILE_SIZE + TILE_SIZE / 2;

    this.currentRoom = new Room(this, roomData, PLAYFIELD_X, PLAYFIELD_Y);

    if (!this.player) {
      this.player = new Player(
        this,
        this.selectedCharacter,
        spawnX,
        spawnY,
        PLAYFIELD_X,
        PLAYFIELD_Y,
      );
      this.player.onDeath = () => this.performRespawn();
    } else {
      this.player.setPosition(spawnX, spawnY);
    }

    this.currentCollider = this.physics.add.collider(
      this.player.getPhysicsObject(),
      this.currentRoom.getPhysicsGroup(),
    );

    this.hud.setRoomName(roomData.name);
    this.triggeredPlates.clear();

    const enemies = this.getOrCreateRoomEnemies(roomData.id);
    for (const enemy of enemies) {
      if (!enemy.isDead()) {
        enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
      }
    }
  }

  // ── Enemy management ─────────────────────────────────────────────────────────

  private getOrCreateRoomEnemies(roomId: string): Enemy[] {
    if (!this.enemyMap.has(roomId)) {
      this.enemyMap.set(roomId, this.createEnemiesForRoom(roomId));
    }
    return this.enemyMap.get(roomId)!;
  }

  private createEnemiesForRoom(roomId: string): Enemy[] {
    if (roomId === 'room_01') {
      return [new NullPointer(
        this,
        PLAYFIELD_X + 10 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y +  5 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    if (roomId === 'room_02') {
      return [new StackOverflow(
        this,
        PLAYFIELD_X + 7 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y + 3 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    if (roomId === 'room_03') {
      return [new InfiniteLoop(
        this,
        PLAYFIELD_X + 11 * TILE_SIZE + TILE_SIZE / 2,
        PLAYFIELD_Y +  8 * TILE_SIZE + TILE_SIZE / 2,
      )];
    }
    return [];
  }

  private resetAllEnemies(): void {
    for (const enemies of this.enemyMap.values()) {
      for (const enemy of enemies) {
        enemy.forceDestroy();
      }
    }
    this.enemyMap.clear();
  }

  private destroyActiveProjectiles(): void {
    for (const proj of this.activeProjectiles) {
      proj.destroy();
    }
    this.activeProjectiles = [];
  }

  // ── Player respawn ────────────────────────────────────────────────────────────

  private performRespawn(): void {
    this.currentCollider.destroy();
    this.destroyActiveProjectiles();
    this.resetAllEnemies();

    const oldRoom    = this.currentRoom;
    this.currentRoom = new Room(this, ALL_ROOMS['room_01'], PLAYFIELD_X, PLAYFIELD_Y);

    const spawnX = PLAYFIELD_X + 7 * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = PLAYFIELD_Y + 5 * TILE_SIZE + TILE_SIZE / 2;
    this.player.respawn(spawnX, spawnY);

    this.currentCollider = this.physics.add.collider(
      this.player.getPhysicsObject(),
      this.currentRoom.getPhysicsGroup(),
    );

    this.hud.setRoomName(ALL_ROOMS['room_01'].name);
    this.triggeredPlates.clear();
    oldRoom.destroy();

    const enemies = this.getOrCreateRoomEnemies('room_01');
    for (const enemy of enemies) {
      if (!enemy.isDead()) {
        enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
      }
    }

    this.transitioning = false;
  }

  // ── Room transitions ──────────────────────────────────────────────────────────

  private slideDir(tileX: number, tileY: number): SlideDir {
    if (tileY === 0)                     return 'north';
    if (tileY === ROOM_HEIGHT_TILES - 1) return 'south';
    if (tileX === 0)                     return 'west';
    return 'east';
  }

  private startTransition(dest: DoorTarget, dir: SlideDir): void {
    const destRoomData = ALL_ROOMS[dest.roomId];
    if (!destRoomData) return;

    this.transitioning = true;
    this.player.disableInput();
    this.currentCollider.destroy();

    // Clear wall colliders for leaving-room enemies
    const leavingEnemies = this.enemyMap.get(this.currentRoom.roomData.id) ?? [];
    for (const enemy of leavingEnemies) enemy.clearWallCollider();

    this.destroyActiveProjectiles();

    const oldContainer = this.currentRoom.getContainer();
    const newRoom      = new Room(this, destRoomData, PLAYFIELD_X, PLAYFIELD_Y);
    const newContainer = newRoom.getContainer();

    const dx = dir === 'east' ? -CANVAS_W : dir === 'west' ?  CANVAS_W : 0;
    const dy = dir === 'north' ?  600      : dir === 'south' ? -600     : 0;

    newContainer.setPosition(PLAYFIELD_X - dx, PLAYFIELD_Y - dy);

    this.tweens.add({
      targets: oldContainer,
      x: PLAYFIELD_X + dx,
      y: PLAYFIELD_Y + dy,
      duration: 400,
      ease: 'Quad.easeInOut',
    });

    this.tweens.add({
      targets: newContainer,
      x: PLAYFIELD_X,
      y: PLAYFIELD_Y,
      duration: 400,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        const oldRoom    = this.currentRoom;
        this.currentRoom = newRoom;

        const spawnX = PLAYFIELD_X + dest.spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
        const spawnY = PLAYFIELD_Y + dest.spawnTile.y * TILE_SIZE + TILE_SIZE / 2;
        this.player.setPosition(spawnX, spawnY);

        this.currentCollider = this.physics.add.collider(
          this.player.getPhysicsObject(),
          this.currentRoom.getPhysicsGroup(),
        );

        this.hud.setRoomName(destRoomData.name);
        this.triggeredPlates.clear();
        oldRoom.destroy();

        // Wire colliders for entering-room enemies; hide others
        const enteringEnemies = this.getOrCreateRoomEnemies(dest.roomId);
        for (const enemy of enteringEnemies) {
          if (!enemy.isDead()) {
            enemy.wireWallCollider(this.currentRoom.getPhysicsGroup());
          }
        }
        for (const [roomId, roomEnemies] of this.enemyMap) {
          const visible = roomId === dest.roomId;
          for (const enemy of roomEnemies) enemy.setVisualVisible(visible);
        }

        this.player.enableInput();
        this.transitioning = false;
      },
    });
  }

  // ── Pressure plate ────────────────────────────────────────────────────────────

  private activatePressurePlate(tileX: number, tileY: number): void {
    this.currentRoom.triggerPressurePlate(tileX, tileY);

    const rect = this.currentRoom.getVisualRectAt(tileX, tileY);
    if (rect) {
      const origColor = 0x1a4a6a;
      rect.setFillStyle(0x88ddff);
      this.time.delayedCall(180, () => { rect.setFillStyle(origColor); });
    }
  }

  // ── Physics helpers ───────────────────────────────────────────────────────────

  private aabbOverlap(
    a: Phaser.Physics.Arcade.Image,
    b: Phaser.Physics.Arcade.Image,
  ): boolean {
    const ba = a.body;
    const bb = b.body;
    if (!ba || !bb) return false;
    return ba.right > bb.left && ba.left < bb.right
        && ba.bottom > bb.top && ba.top < bb.bottom;
  }
}
