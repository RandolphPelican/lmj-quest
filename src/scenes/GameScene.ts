import Phaser from 'phaser';
import { CharacterDefinition } from '../shared/characters';

export class GameScene extends Phaser.Scene {
  private selectedCharacter?: CharacterDefinition;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { character: CharacterDefinition }): void {
    this.selectedCharacter = data.character;
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, 'GAME SCENE', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, `Playing as: ${this.selectedCharacter?.name ?? 'UNKNOWN'}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffcc00',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, 'Phase 3 — Room Engine Coming Soon', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00ff88',
      })
      .setOrigin(0.5);
  }
}