import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2 - 40;

    // Gold color for title
    const GOLD = 0xffcc00;
    // Rasta colors
    const RASTA_RED = '#e63946';
    const RASTA_YELLOW = '#ffcc00';
    const RASTA_GREEN = '#2a9d3f';

    // Title text (hidden initially) — used as the target position reference
    const titleText = this.add
      .text(centerX, centerY, 'LINK QUEST', {
        fontFamily: 'monospace',
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Create ~80 small gold squares scattered off-screen on all four edges
    const PARTICLE_COUNT = 80;
    const PARTICLE_SIZE = 8;
    const particles: Phaser.GameObjects.Rectangle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Randomly pick an edge (0=top, 1=right, 2=bottom, 3=left)
      const edge = Phaser.Math.Between(0, 3);
      let startX = 0;
      let startY = 0;

      switch (edge) {
        case 0: // top
          startX = Phaser.Math.Between(0, width);
          startY = -20;
          break;
        case 1: // right
          startX = width + 20;
          startY = Phaser.Math.Between(0, height);
          break;
        case 2: // bottom
          startX = Phaser.Math.Between(0, width);
          startY = height + 20;
          break;
        case 3: // left
          startX = -20;
          startY = Phaser.Math.Between(0, height);
          break;
      }

      const particle = this.add.rectangle(
        startX,
        startY,
        PARTICLE_SIZE,
        PARTICLE_SIZE,
        GOLD,
      );
      particles.push(particle);
    }

    // Calculate target positions spread across the title bounds
    const titleBounds = titleText.getBounds();
    const targetPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      targetPositions.push({
        x: Phaser.Math.Between(titleBounds.left, titleBounds.right),
        y: Phaser.Math.Between(titleBounds.top, titleBounds.bottom),
      });
    }

    // Fly particles in with staggered timing
    particles.forEach((particle, index) => {
      const target = targetPositions[index];
      this.tweens.add({
        targets: particle,
        x: target.x,
        y: target.y,
        duration: 900,
        delay: index * 10,
        ease: 'Cubic.easeOut',
      });
    });

    // After particles arrive, reveal the title and fade particles out
    this.time.delayedCall(1700, () => {
      // Fade the title in
      this.tweens.add({
        targets: titleText,
        alpha: 1,
        duration: 400,
        ease: 'Linear',
      });

      // Fade the particles out
      this.tweens.add({
        targets: particles,
        alpha: 0,
        duration: 500,
        ease: 'Linear',
        onComplete: () => {
          particles.forEach((p) => p.destroy());
        },
      });
    });

    // Subtitle — "by Randolph Pelican III" in Rasta colors
    // Using three separate text objects positioned side-by-side
    const subtitleY = centerY + 80;
    const subtitleFontSize = '24px';
    const subtitleFont = 'monospace';

    const byText = this.add
      .text(0, subtitleY, 'by ', {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: RASTA_RED,
      })
      .setAlpha(0);

    const nameText = this.add
      .text(0, subtitleY, 'Randolph Pelican ', {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: RASTA_YELLOW,
      })
      .setAlpha(0);

    const suffixText = this.add
      .text(0, subtitleY, 'III', {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: RASTA_GREEN,
      })
      .setAlpha(0);

    // Position the three texts so they sit side-by-side, centered as a group
    const totalWidth = byText.width + nameText.width + suffixText.width;
    const subtitleStartX = centerX - totalWidth / 2;
    byText.setX(subtitleStartX);
    nameText.setX(subtitleStartX + byText.width);
    suffixText.setX(subtitleStartX + byText.width + nameText.width);

    // Fade subtitle in after title reveals
    this.time.delayedCall(2300, () => {
      this.tweens.add({
        targets: [byText, nameText, suffixText],
        alpha: 1,
        duration: 600,
        ease: 'Linear',
      });
    });

    // Hold for ~1.5 seconds, then fade everything and transition
    this.time.delayedCall(4200, () => {
      this.tweens.add({
        targets: [titleText, byText, nameText, suffixText],
        alpha: 0,
        duration: 500,
        ease: 'Linear',
        onComplete: () => {
          this.scene.start('CharacterSelectScene');
        },
      });
    });
  }
}