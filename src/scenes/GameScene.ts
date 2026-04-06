import Phaser from 'phaser';
import { TILE_SIZE, ROOM_HEIGHT_TILES, ROOM_PIXEL_WIDTH, TileFlag } from '../shared/tiles';
import { ALL_ROOMS } from '../shared/rooms';
import type { RoomData, DoorTarget } from '../shared/rooms';
import { Room } from '../game/Room';
import { Player, type WASDKeys } from '../game/Player';
import { HUD } from '../game/HUD';
import { DebugOverlay } from '../game/DebugOverlay';
import type { CharacterDefinition } from '../shared/characters';

// Playfield layout constants
const HUD_HEIGHT = 80;
const CANVAS_W   = 800;
const PLAYFIELD_X = (CANVAS_W - ROOM_PIXEL_WIDTH) / 2;  // 160
const PLAYFIELD_Y = HUD_HEIGHT;                          // 80

// Direction the player is travelling when they step on a border door
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

  private transitioning = false;
  private readonly triggeredPlates = new Set<string>();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { character: CharacterDefinition }): void {
    this.selectedCharacter = data.character;
    this.triggeredPlates.clear();
    this.transitioning = false;
  }

  create(): void {
    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.f1Key = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.f1Key.on('down', () => this.debugOverlay.toggle());

    // HUD (create before room so background renders under)
    this.hud = new HUD(this, this.selectedCharacter);

    // Debug overlay
    this.debugOverlay = new DebugOverlay(this);

    // Load starting room, spawn player at center
    const spawnTile = { x: 7, y: 5 };
    this.loadRoom(ALL_ROOMS['room_01'], spawnTile);
  }

  update(): void {
    if (this.transitioning) return;

    const px = this.player.getX();
    const py = this.player.getY();
    const flags = this.currentRoom.getFlagsAt(px, py);

    // Apply terrain effects BEFORE movement so they take effect this frame
    this.player.applyTerrainEffect(flags);
    this.player.update(this.cursors, this.wasd);

    const tx = this.player.getTileX();
    const ty = this.player.getTileY();

    // Door check
    const door = this.currentRoom.getDoorAt(tx, ty);
    if (door) {
      const dir = this.slideDir(tx, ty);
      this.startTransition(door, dir);
      return;
    }

    // Pressure plate check (one-shot per room instance)
    if (flags & TileFlag.PressurePlate) {
      const key = `${tx},${ty}`;
      if (!this.triggeredPlates.has(key)) {
        this.triggeredPlates.add(key);
        this.activatePressurePlate(tx, ty);
      }
    }

    this.debugOverlay.update(this.player, this.currentRoom);
  }

  // ── Room loading ────────────────────────────────────────────────────────────

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
  }

  // ── Room transitions ────────────────────────────────────────────────────────

  private slideDir(tileX: number, tileY: number): SlideDir {
    if (tileY === 0)                    return 'north';
    if (tileY === ROOM_HEIGHT_TILES - 1) return 'south';
    if (tileX === 0)                    return 'west';
    return 'east';
  }

  private startTransition(dest: DoorTarget, dir: SlideDir): void {
    const destRoomData = ALL_ROOMS[dest.roomId];
    if (!destRoomData) return;

    this.transitioning = true;
    this.player.disableInput();

    // Destroy current collider — player won't move during transition
    this.currentCollider.destroy();

    const oldContainer = this.currentRoom.getContainer();

    // Build the new room (physics bodies placed at world coords immediately)
    const newRoom = new Room(this, destRoomData, PLAYFIELD_X, PLAYFIELD_Y);
    const newContainer = newRoom.getContainer();

    // Determine slide offsets
    const dx = dir === 'east' ? -CANVAS_W : dir === 'west' ?  CANVAS_W : 0;
    const dy = dir === 'north' ?  600      : dir === 'south' ? -600     : 0;

    // Position new room container off-screen on the opposite side
    newContainer.setPosition(PLAYFIELD_X - dx, PLAYFIELD_Y - dy);

    // Slide old room off
    this.tweens.add({
      targets: oldContainer,
      x: PLAYFIELD_X + dx,
      y: PLAYFIELD_Y + dy,
      duration: 400,
      ease: 'Quad.easeInOut',
    });

    // Slide new room in
    this.tweens.add({
      targets: newContainer,
      x: PLAYFIELD_X,
      y: PLAYFIELD_Y,
      duration: 400,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        const oldRoom = this.currentRoom;
        this.currentRoom = newRoom;

        // Reposition player at destination spawn
        const spawnX = PLAYFIELD_X + dest.spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
        const spawnY = PLAYFIELD_Y + dest.spawnTile.y * TILE_SIZE + TILE_SIZE / 2;
        this.player.setPosition(spawnX, spawnY);

        // Wire up new collider
        this.currentCollider = this.physics.add.collider(
          this.player.getPhysicsObject(),
          this.currentRoom.getPhysicsGroup(),
        );

        this.hud.setRoomName(destRoomData.name);
        this.triggeredPlates.clear();

        // Clean up old room after it has slid off-screen
        oldRoom.destroy();

        this.player.enableInput();
        this.transitioning = false;
      },
    });
  }

  // ── Pressure plate ─────────────────────────────────────────────────────────

  private activatePressurePlate(tileX: number, tileY: number): void {
    this.currentRoom.triggerPressurePlate(tileX, tileY);

    // Brief flash on the plate tile itself
    const rect = this.currentRoom.getVisualRectAt(tileX, tileY);
    if (rect) {
      const origColor = 0x1a4a6a;
      rect.setFillStyle(0x88ddff);
      this.time.delayedCall(180, () => {
        rect.setFillStyle(origColor);
      });
    }
  }
}
