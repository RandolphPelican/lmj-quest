import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 20, 'LMJ QUEST', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, 'Phase 0 — Scaffold OK', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#00ff88',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 30, 'by Randolph Pelican III', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#888888',
      })
      .setOrigin(0.5);
  }
}