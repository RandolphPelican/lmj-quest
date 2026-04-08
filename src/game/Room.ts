import Phaser from 'phaser';
import {
  TILES,
  FALLBACK_TILE,
  TILE_SIZE,
  ROOM_WIDTH_TILES,
  ROOM_HEIGHT_TILES,
  TileFlag,
  type TileDefinition,
} from '../shared/tiles';
import type { RoomData, DoorTarget } from '../shared/rooms';

export class Room {
  public readonly roomData: RoomData;

  private readonly scene: Phaser.Scene;
  private readonly playfieldX: number;
  private readonly playfieldY: number;

  private readonly container: Phaser.GameObjects.Container;
  private readonly physicsGroup: Phaser.Physics.Arcade.StaticGroup;

  // 2-D arrays indexed [tileY][tileX]
  private readonly liveTiles: string[][];
  private readonly visualRects: (Phaser.GameObjects.Rectangle | null)[][];
  private readonly physicsSprites: (Phaser.Physics.Arcade.Sprite | null)[][];

  constructor(
    scene: Phaser.Scene,
    roomData: RoomData,
    playfieldX: number,
    playfieldY: number,
  ) {
    this.scene = scene;
    this.roomData = roomData;
    this.playfieldX = playfieldX;
    this.playfieldY = playfieldY;

    // Mutable tile state (copy of layout as 2-D char array)
    this.liveTiles = roomData.layout.map(row => Array.from(row));

    // Pre-allocate visual/physics grids with nulls
    this.visualRects = Array.from({ length: ROOM_HEIGHT_TILES }, () =>
      new Array<Phaser.GameObjects.Rectangle | null>(ROOM_WIDTH_TILES).fill(null),
    );
    this.physicsSprites = Array.from({ length: ROOM_HEIGHT_TILES }, () =>
      new Array<Phaser.Physics.Arcade.Sprite | null>(ROOM_WIDTH_TILES).fill(null),
    );

    // Container holds all visuals; positioned at playfield origin so children use
    // local tile coords and slide together during room transitions.
    this.container = scene.add.container(playfieldX, playfieldY);
    this.container.setDepth(0);

    this.physicsGroup = scene.physics.add.staticGroup();

    this.buildRoom();
  }

  private buildRoom(): void {
    for (let ty = 0; ty < ROOM_HEIGHT_TILES; ty++) {
      for (let tx = 0; tx < ROOM_WIDTH_TILES; tx++) {
        const char = this.liveTiles[ty]?.[tx] ?? '#';
        const tiledef = TILES[char] ?? FALLBACK_TILE;

        // Visual rectangle (local coords, centered in tile)
        const localX = tx * TILE_SIZE + TILE_SIZE / 2;
        const localY = ty * TILE_SIZE + TILE_SIZE / 2;
        const rect = this.scene.add.rectangle(localX, localY, TILE_SIZE, TILE_SIZE, tiledef.color);
        if (tiledef.strokeColor !== undefined) {
          rect.setStrokeStyle(1, tiledef.strokeColor);
        }
        this.container.add(rect);
        this.visualRects[ty][tx] = rect;

        // Physics body for solid tiles (world coords)
        if (tiledef.flags & TileFlag.Solid) {
          const worldX = this.playfieldX + tx * TILE_SIZE + TILE_SIZE / 2;
          const worldY = this.playfieldY + ty * TILE_SIZE + TILE_SIZE / 2;
          const spr = this.physicsGroup.create(worldX, worldY, '__DEFAULT') as Phaser.Physics.Arcade.Sprite;
          spr.setDisplaySize(TILE_SIZE, TILE_SIZE);
          spr.refreshBody();
          spr.setVisible(false);
          this.physicsSprites[ty][tx] = spr;
        }
      }
    }

    this.physicsGroup.refresh();

    // DIAGNOSTIC — remove once margin is confirmed fixed
    console.log(
      `[Room "${this.roomData.id}"] container=(${this.container.x}, ${this.container.y}) ` +
      `scale=(${this.container.scaleX}, ${this.container.scaleY}) ` +
      `tile[0,0] world-center-X=${this.playfieldX + TILE_SIZE / 2} ` +
      `tile[29,0] world-center-X=${this.playfieldX + 29 * TILE_SIZE + TILE_SIZE / 2}`,
    );
  }

  getTileAt(tileX: number, tileY: number): TileDefinition {
    if (tileX < 0 || tileX >= ROOM_WIDTH_TILES || tileY < 0 || tileY >= ROOM_HEIGHT_TILES) {
      return FALLBACK_TILE;
    }
    const char = this.liveTiles[tileY]?.[tileX] ?? '#';
    return TILES[char] ?? FALLBACK_TILE;
  }

  getFlagsAt(pixelX: number, pixelY: number): number {
    const tx = Math.floor((pixelX - this.playfieldX) / TILE_SIZE);
    const ty = Math.floor((pixelY - this.playfieldY) / TILE_SIZE);
    return this.getTileAt(tx, ty).flags;
  }

  getDoorAt(tileX: number, tileY: number): DoorTarget | null {
    const tiledef = this.getTileAt(tileX, tileY);
    if (!(tiledef.flags & TileFlag.Door)) return null;
    const key = `${tileX},${tileY}`;
    const dest = (this.roomData.doors as Record<string, DoorTarget | undefined>)[key];
    return dest ?? null;
  }

  getSignAt(tileX: number, tileY: number): string | null {
    if (!this.roomData.signs) return null;
    const key = `${tileX},${tileY}`;
    const text = (this.roomData.signs as Record<string, string | undefined>)[key];
    return text ?? null;
  }

  getPhysicsGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.physicsGroup;
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getVisualRectAt(tileX: number, tileY: number): Phaser.GameObjects.Rectangle | null {
    return this.visualRects[tileY]?.[tileX] ?? null;
  }

  getSolidBounds(): Array<{ x: number; y: number; w: number; h: number }> {
    const result: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let ty = 0; ty < ROOM_HEIGHT_TILES; ty++) {
      for (let tx = 0; tx < ROOM_WIDTH_TILES; tx++) {
        const tile = this.getTileAt(tx, ty);
        if (tile.flags & TileFlag.Solid) {
          result.push({
            x: this.playfieldX + tx * TILE_SIZE,
            y: this.playfieldY + ty * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE,
          });
        }
      }
    }
    return result;
  }

  // Called by GameScene when a pressure plate is stepped on.
  // Converts the linked locked door tile from 'L' to 'O' (visual + physics update).
  triggerPressurePlate(tileX: number, tileY: number): void {
    if (!this.roomData.pressurePlates) return;
    const plate = this.roomData.pressurePlates.find(
      p => p.tileX === tileX && p.tileY === tileY,
    );
    if (!plate) return;

    const { x: dx, y: dy } = plate.opensLockedDoorAt;

    // Update live tile state
    if (this.liveTiles[dy]) this.liveTiles[dy][dx] = 'O';

    // Update visual: change fill to open-door color, remove stroke
    const rect = this.visualRects[dy]?.[dx];
    if (rect) {
      rect.setFillStyle(TILES['O'].color);
      rect.setStrokeStyle(0);
    }

    // Remove the solid physics body
    const spr = this.physicsSprites[dy]?.[dx];
    if (spr) {
      this.physicsGroup.remove(spr, true, true);
      this.physicsSprites[dy][dx] = null;
      this.physicsGroup.refresh();
    }
  }

  destroy(): void {
    this.physicsGroup.clear(true, true);
    this.physicsGroup.destroy();
    this.container.removeAll(true);
    this.container.destroy();
  }
}
