import Phaser from 'phaser';
import type { CharacterDefinition } from '../shared/characters';

const DEPTH = 10;
const BAR_W = 100;
const BAR_H = 10;

export class HUD {
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly mpFill: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly mpText: Phaser.GameObjects.Text;
  private readonly keyRects: Phaser.GameObjects.Rectangle[];
  private readonly roomNameText: Phaser.GameObjects.Text;

  private readonly keyActiveColors: number[] = [0xcd7f32, 0xc0c0c0, 0xffd700];
  private readonly keyMap: Record<'bronze' | 'silver' | 'gold', number> = {
    bronze: 0, silver: 1, gold: 2,
  };

  constructor(scene: Phaser.Scene, character: CharacterDefinition) {
    // Dark top bar background
    scene.add.rectangle(400, 40, 800, 80, 0x111111).setDepth(DEPTH - 1);

    // Portrait (Lincoln's compound shape, scaled 0.5×)
    const portrait = scene.add.container(38, 40);
    portrait.setDepth(DEPTH);
    portrait.setScale(0.5);
    const pBody   = scene.add.rectangle(0, 5, 32, 40, character.primaryColor);
    const pHelmet = scene.add.rectangle(0, -20, 28, 14, character.accentColor);
    const pEyeL   = scene.add.circle(-5, -20, 2, 0xffffff);
    const pEyeR   = scene.add.circle(5, -20, 2, 0xffffff);
    const pSword  = scene.add.triangle(22, 5, 0, -15, 0, 15, 10, 0, 0xcccccc);
    portrait.add([pBody, pHelmet, pEyeL, pEyeR, pSword]);

    // ── HP bar ──────────────────────────────────────────────
    const hpBarX = 72;
    const hpBarY = 24;
    scene.add.text(hpBarX, hpBarY, 'HP', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff6666',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    // Bar background
    scene.add.rectangle(hpBarX + 20, hpBarY, BAR_W, BAR_H, 0x330000)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    // Bar fill — starts full width, scaled via scaleX
    this.hpFill = scene.add.rectangle(hpBarX + 20, hpBarY, BAR_W, BAR_H, 0xff4444)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.hpText = scene.add.text(hpBarX + 20 + BAR_W + 4, hpBarY, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff8888',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    // ── MP bar ──────────────────────────────────────────────
    const mpBarX = 72;
    const mpBarY = 40;
    scene.add.text(mpBarX, mpBarY, 'MP', {
      fontFamily: 'monospace', fontSize: '10px', color: '#6688ff',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    scene.add.rectangle(mpBarX + 20, mpBarY, BAR_W, BAR_H, 0x000033)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.mpFill = scene.add.rectangle(mpBarX + 20, mpBarY, BAR_W, BAR_H, 0x4466ff)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.mpText = scene.add.text(mpBarX + 20 + BAR_W + 4, mpBarY, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#88aaff',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    // ── Weapon name ─────────────────────────────────────────
    scene.add.text(400, 22, character.attackName, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffcc00',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH);

    scene.add.text(400, 38, character.spellName, {
      fontFamily: 'monospace', fontSize: '10px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH);

    // ── Key slots (top-right) ───────────────────────────────
    const keyLabels: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold'];
    this.keyRects = keyLabels.map((label, i) => {
      const kx = 700 + i * 22;
      const ky = 40;
      const r = scene.add.rectangle(kx, ky, 16, 16, 0x222222)
        .setStrokeStyle(1.5, this.keyActiveColors[i])
        .setDepth(DEPTH);
      scene.add.text(kx, ky + 14, label.slice(0, 2).toUpperCase(), {
        fontFamily: 'monospace', fontSize: '8px', color: '#555555',
      }).setOrigin(0.5, 0).setDepth(DEPTH);
      return r;
    });

    // ── Bottom room-name strip ──────────────────────────────
    scene.add.rectangle(400, 586, 800, 28, 0x111111).setDepth(DEPTH - 1);

    this.roomNameText = scene.add.text(400, 586, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH);

    // Seed initial values from character stats
    this.setHP(character.stats.hp, character.stats.hp);
    this.setMP(character.stats.mp, character.stats.mp);
  }

  setHP(current: number, max: number): void {
    const pct = Math.max(0, Math.min(1, current / max));
    this.hpFill.scaleX = pct;
    this.hpText.setText(`${current}/${max}`);
  }

  setMP(current: number, max: number): void {
    const pct = Math.max(0, Math.min(1, current / max));
    this.mpFill.scaleX = pct;
    this.mpText.setText(`${current}/${max}`);
  }

  setRoomName(name: string): void {
    this.roomNameText.setText(name);
  }

  setKey(color: 'bronze' | 'silver' | 'gold', owned: boolean): void {
    const idx = this.keyMap[color];
    this.keyRects[idx].setFillStyle(owned ? this.keyActiveColors[idx] : 0x222222);
  }
}
