import Phaser from 'phaser';

export class PauseManager {
  private readonly scene: Phaser.Scene;
  private paused = false;

  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly pausedText: Phaser.GameObjects.Text;
  private readonly resumeText: Phaser.GameObjects.Text;
  private readonly escKey: Phaser.Input.Keyboard.Key;

  private onPauseStateChange: ((paused: boolean) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Semi-transparent overlay covering only the playfield (x=0–960, y=48–592)
    this.overlay = scene.add.rectangle(480, 320, 960, 544, 0x000000, 0.7);
    this.overlay.setDepth(100);
    this.overlay.setVisible(false);

    this.pausedText = scene.add.text(480, 290, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.resumeText = scene.add.text(480, 350, 'Press ESC to Resume', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    this.escKey = scene.input.keyboard!.addKey('ESC');
  }

  setOnPauseStateChange(cb: (paused: boolean) => void): void {
    this.onPauseStateChange = cb;
  }

  checkInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.toggle();
    }
  }

  toggle(): void {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  private pause(): void {
    this.paused = true;
    this.scene.physics.world.pause();
    this.scene.tweens.pauseAll();
    this.scene.time.paused = true;
    this.overlay.setVisible(true);
    this.pausedText.setVisible(true);
    this.resumeText.setVisible(true);
    this.onPauseStateChange?.(true);
  }

  private resume(): void {
    this.paused = false;
    this.scene.physics.world.resume();
    this.scene.tweens.resumeAll();
    this.scene.time.paused = false;
    this.overlay.setVisible(false);
    this.pausedText.setVisible(false);
    this.resumeText.setVisible(false);
    this.onPauseStateChange?.(false);
  }

  isPaused(): boolean { return this.paused; }
}
