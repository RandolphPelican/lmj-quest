import Phaser from 'phaser';

export class SignPopup {
  private readonly container: Phaser.GameObjects.Container;
  private readonly textObj: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene, canvasW: number, canvasH: number) {
    const panelW = 500;
    const panelH = 140;
    const px = canvasW / 2;
    const py = canvasH / 2;

    const backing = scene.add.rectangle(0, 0, panelW + 8, panelH + 8, 0xffd700);
    const panel   = scene.add.rectangle(0, 0, panelW, panelH, 0x111111);
    panel.setAlpha(0.92);

    // Scroll icon: small parchment rectangle top-center
    const scroll = scene.add.rectangle(0, -(panelH / 2) - 10, 32, 16, 0xd4a84b);

    this.textObj = scene.add.text(0, -10, '', {
      fontSize:   '16px',
      fontFamily: 'monospace',
      color:      '#e8e8e8',
      align:      'center',
      wordWrap:   { width: panelW - 48 },
    });
    this.textObj.setOrigin(0.5, 0.5);

    const hint = scene.add.text(0, panelH / 2 - 18, 'press O to close', {
      fontSize:   '11px',
      fontFamily: 'monospace',
      color:      '#888888',
    });
    hint.setOrigin(0.5, 0.5);

    this.container = scene.add.container(px, py, [backing, panel, scroll, this.textObj, hint]);
    this.container.setDepth(10);
    this.container.setVisible(false);
  }

  show(text: string): void {
    this.textObj.setText(text);
    this.container.setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
  }

  isVisible(): boolean { return this.visible; }
}
