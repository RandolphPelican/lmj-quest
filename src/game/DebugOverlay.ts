import Phaser from 'phaser';
import type { Player } from './Player';
import type { Room } from './Room';

const DEPTH = 20;

export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Text[];
  private visible = false;

  private static readonly LINE_KEYS = [
    'fps', 'pos', 'tile', 'room', 'tileInfo',
  ] as const;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH);
    this.graphics.setVisible(false);

    // Five info lines in the bottom-right corner
    const x = 796;
    const baseY = 500;
    const lineH = 14;
    this.lines = DebugOverlay.LINE_KEYS.map((_, i) =>
      scene.add.text(x, baseY + i * lineH, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#00ff88',
        backgroundColor: '#00000099',
        padding: { x: 3, y: 1 },
      }).setOrigin(1, 0).setDepth(DEPTH).setVisible(false),
    );
  }

  toggle(): void {
    this.visible = !this.visible;
    this.graphics.setVisible(this.visible);
    for (const line of this.lines) line.setVisible(this.visible);
    if (!this.visible) this.graphics.clear();
  }

  update(player: Player, room: Room): void {
    if (!this.visible) return;

    const fps = Math.round(this.scene.game.loop.actualFps);
    const px = Math.round(player.getX());
    const py = Math.round(player.getY());
    const tx = player.getTileX();
    const ty = player.getTileY();
    const tiledef = room.getTileAt(tx, ty);

    const data = [
      `FPS: ${fps}`,
      `POS: ${px}, ${py}`,
      `TILE: ${tx}, ${ty}`,
      `ROOM: ${room.roomData.id}`,
      `[${tiledef.char}] flags:${tiledef.flags}`,
    ];

    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i].setText(data[i] ?? '');
    }

    // Green outlines over every solid physics body
    this.graphics.clear();
    this.graphics.lineStyle(1, 0x00ff00, 0.7);
    for (const b of room.getSolidBounds()) {
      this.graphics.strokeRect(b.x, b.y, b.w, b.h);
    }
  }
}
