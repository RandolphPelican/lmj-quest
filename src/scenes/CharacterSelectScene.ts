import Phaser from 'phaser';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 20, 'CHARACTER SELECT', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, 'Phase 2 — Coming Soon', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#00ff88',
      })
      .setOrigin(0.5);
  }
}