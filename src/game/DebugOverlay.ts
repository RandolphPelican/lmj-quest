import Phaser from 'phaser';
import type { Player } from './Player';
import type { Room } from './Room';
import type { Enemy } from './entities/Enemy';

const DEPTH = 20;
const LINE_COUNT = 8;

export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Text[];
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH);
    this.graphics.setVisible(false);

    const x = 796;
    const baseY = 458;
    const lineH = 14;
    this.lines = Array.from({ length: LINE_COUNT }, (_, i) =>
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

  update(player: Player, room: Room, roomEnemies: Enemy[]): void {
    if (!this.visible) return;

    const fps = Math.round(this.scene.game.loop.actualFps);
    const px = Math.round(player.getX());
    const py = Math.round(player.getY());
    const tx = player.getTileX();
    const ty = player.getTileY();
    const tiledef = room.getTileAt(tx, ty);
    const swd = Math.max(0, Math.round(player.getSwordCooldown()));
    const bsh = Math.max(0, Math.round(player.getBashCooldown()));

    const aliveCount = roomEnemies.filter(e => !e.isDead()).length;
    const data = [
      `FPS: ${fps}`,
      `POS: ${px}, ${py}`,
      `TILE: ${tx}, ${ty}`,
      `ROOM: ${room.roomData.id}`,
      `[${tiledef.char}] flags:${tiledef.flags}`,
      `MP: ${player.getMP()}/${player.getMaxMP()}`,
      `SWD:${swd}ms  BSH:${bsh}ms`,
      `ENEMIES: ${aliveCount}`,
    ];

    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i].setText(data[i] ?? '');
    }

    // Solid tile outlines — green
    this.graphics.clear();
    this.graphics.lineStyle(1, 0x00ff00, 0.7);
    for (const b of room.getSolidBounds()) {
      this.graphics.strokeRect(b.x, b.y, b.w, b.h);
    }

    // Active attack hitboxes — yellow
    const swordHitbox = player.getSwordHitbox();
    const sb = swordHitbox?.body;
    if (sb) {
      this.graphics.lineStyle(2, 0xffff00, 1);
      this.graphics.strokeRect(sb.left, sb.top, sb.right - sb.left, sb.bottom - sb.top);
    }

    const bashHitbox = player.getBashHitbox();
    const bb = bashHitbox?.body;
    if (bb) {
      this.graphics.lineStyle(2, 0xffff00, 1);
      this.graphics.strokeRect(bb.left, bb.top, bb.right - bb.left, bb.bottom - bb.top);
    }
  }
}
