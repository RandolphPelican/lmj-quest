import Phaser from 'phaser';
import {
  TILE_SIZE,
  ROOM_HEIGHT_TILES,
  ROOM_WIDTH_TILES,
  ROOM_PIXEL_WIDTH,
  TileFlag,
} from '../shared/tiles';
import { ALL_ROOMS } from '../shared/rooms';
import type { RoomData, DoorTarget } from '../shared/rooms';
import { Room } from '../game/Room';
import { Player, type WASDKeys } from '../game/Player';
import { HUD } from '../game/HUD';
import { DebugOverlay } from '../game/DebugOverlay';
import { Dummy } from '../game/entities/Dummy';
import type { CharacterDefinition } from '../shared/characters';

const HUD_HEIGHT  = 80;
const CANVAS_W    = 800;
const PLAYFIELD_X = (CANVAS_W - ROOM_PIXEL_WIDTH) / 2;  // 160
const PLAYFIELD_Y = HUD_HEIGHT;                          // 80

type SlideDir = 'north' | 'south' | 'east' | 'west';

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
  private jKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;

  private transitioning = false;
  private readonly triggeredPlates = new Set<string>();

  // Combat test dummy
  private currentDummy: Dummy | null = null;
  private dummyRespawnTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { character: CharacterDefinition }): void {
    this.selectedCharacter = data.character;
    this.triggeredPlates.clear();
    this.transitioning = false;
  }

  create(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.f1Key = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.f1Key.on('down', () => this.debugOverlay.toggle());

    this.jKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.pKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.hud = new HUD(this, this.selectedCharacter);
    this.debugOverlay = new DebugOverlay(this);

    this.loadRoom(ALL_ROOMS['room_01'], { x: 7, y: 5 });
  }

  update(): void {
    if (this.transitioning) return;

    const px = this.player.getX();
    const py = this.player.getY();
    const flags = this.currentRoom.getFlagsAt(px, py);

    this.player.applyTerrainEffect(flags);
    this.player.update(this.cursors, this.wasd);

    // ── Combat input ──────────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.jKey)) {
      this.player.trySwingSword();
    }
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.player.tryShieldBash();
    }

    // ── Hit detection ─────────────────────────────────────────────────────────
    if (this.currentDummy && !this.currentDummy.isDead()) {
      const swordHitbox = this.player.getSwordHitbox();
      if (swordHitbox && !this.player.isSwordHitConnected()) {
        if (this.aabbOverlap(swordHitbox, this.currentDummy.getPhysicsCarrier())) {
          this.player.markSwordHitConnected();
          this.currentDummy.takeDamage(20);
        }
      }

      const bashHitbox = this.player.getBashHitbox();
      if (bashHitbox && !this.player.isBashHitConnected()) {
        if (this.aabbOverlap(bashHitbox, this.currentDummy.getPhysicsCarrier())) {
          this.player.markBashHitConnected();
          const dx = this.currentDummy.getX() - this.player.getX();
          const dy = this.currentDummy.getY() - this.player.getY();
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          this.currentDummy.takeDamage(15, { x: dx / len, y: dy / len });
        }
      }
    }

    // ── Dummy update ──────────────────────────────────────────────────────────
    if (this.currentDummy) this.currentDummy.update();

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

    this.debugOverlay.update(this.player, this.currentRoom);
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
    } else {
      this.player.setPosition(spawnX, spawnY);
    }

    this.currentCollider = this.physics.add.collider(
      this.player.getPhysicsObject(),
      this.currentRoom.getPhysicsGroup(),
    );

    this.hud.setRoomName(roomData.name);
    this.triggeredPlates.clear();

    this.spawnDummy(this.currentRoom);
  }

  // ── Dummy lifecycle ───────────────────────────────────────────────────────────

  private spawnDummy(room: Room): void {
    const tile = this.findSafeFloorTile(room);
    const wx = PLAYFIELD_X + tile.x * TILE_SIZE + TILE_SIZE / 2;
    const wy = PLAYFIELD_Y + tile.y * TILE_SIZE + TILE_SIZE / 2;

    this.currentDummy = new Dummy(this, wx, wy, () => {
      this.currentDummy = null;
      this.dummyRespawnTimer = this.time.delayedCall(2000, () => {
        this.dummyRespawnTimer = null;
        this.spawnDummy(this.currentRoom);
      });
    });
  }

  private despawnDummy(): void {
    if (this.dummyRespawnTimer) {
      this.dummyRespawnTimer.destroy();
      this.dummyRespawnTimer = null;
    }
    if (this.currentDummy) {
      this.currentDummy.destroy();
      this.currentDummy = null;
    }
  }

  private findSafeFloorTile(room: Room): { x: number; y: number } {
    const playerTX = this.player ? this.player.getTileX() : -99;
    const playerTY = this.player ? this.player.getTileY() : -99;
    const valid: { x: number; y: number }[] = [];

    for (let ty = 1; ty < ROOM_HEIGHT_TILES - 1; ty++) {
      for (let tx = 1; tx < ROOM_WIDTH_TILES - 1; tx++) {
        if (Math.abs(tx - playerTX) <= 1 && Math.abs(ty - playerTY) <= 1) continue;
        const tileFlags = room.getFlagsAt(
          PLAYFIELD_X + tx * TILE_SIZE + TILE_SIZE / 2,
          PLAYFIELD_Y + ty * TILE_SIZE + TILE_SIZE / 2,
        );
        if (tileFlags === TileFlag.None) {
          valid.push({ x: tx, y: ty });
        }
      }
    }

    if (valid.length === 0) return { x: 10, y: 3 };
    return valid[Math.floor(Math.random() * valid.length)];
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

    // Tear down old dummy before creating new room
    this.despawnDummy();

    const oldContainer = this.currentRoom.getContainer();
    const newRoom = new Room(this, destRoomData, PLAYFIELD_X, PLAYFIELD_Y);
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
        const oldRoom = this.currentRoom;
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

        // Spawn a fresh dummy in the new room
        this.spawnDummy(this.currentRoom);

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
