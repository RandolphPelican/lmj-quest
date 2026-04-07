import Phaser from 'phaser';
import type { CharacterDefinition } from '../shared/characters';

const DEPTH  = 10;
const BAR_W  = 160;
const BAR_H  = 12;

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
    // ── Top bar background (y 0–48) ────────────────────────────────────────────
    scene.add.rectangle(480, 24, 960, 48, 0x111111).setDepth(DEPTH - 1);

    // Portrait (Lincoln compound shape, 0.4× scale), centered in top strip
    const portrait = scene.add.container(24, 24);
    portrait.setDepth(DEPTH);
    portrait.setScale(0.4);
    const pBody   = scene.add.rectangle(0, 5, 32, 40, character.primaryColor);
    const pHelmet = scene.add.rectangle(0, -20, 28, 14, character.accentColor);
    const pEyeL   = scene.add.circle(-5, -20, 2, 0xffffff);
    const pEyeR   = scene.add.circle(5, -20, 2, 0xffffff);
    const pSword  = scene.add.triangle(22, 5, 0, -15, 0, 15, 10, 0, 0xcccccc);
    portrait.add([pBody, pHelmet, pEyeL, pEyeR, pSword]);

    // ── HP bar (top strip, upper row) ──────────────────────────────────────────
    const hpBarX = 80;
    const hpBarY = 18;
    scene.add.text(hpBarX, hpBarY, 'HP', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff6666',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    scene.add.rectangle(hpBarX + 18, hpBarY, BAR_W, BAR_H, 0x330000)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.hpFill = scene.add.rectangle(hpBarX + 18, hpBarY, BAR_W, BAR_H, 0xff4444)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.hpText = scene.add.text(hpBarX + 18 + BAR_W + 4, hpBarY, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#ff8888',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    // ── MP bar (top strip, lower row) ──────────────────────────────────────────
    const mpBarX = 80;
    const mpBarY = 34;
    scene.add.text(mpBarX, mpBarY, 'MP', {
      fontFamily: 'monospace', fontSize: '10px', color: '#6688ff',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    scene.add.rectangle(mpBarX + 18, mpBarY, BAR_W, BAR_H, 0x000033)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.mpFill = scene.add.rectangle(mpBarX + 18, mpBarY, BAR_W, BAR_H, 0x4466ff)
      .setOrigin(0, 0.5).setDepth(DEPTH);

    this.mpText = scene.add.text(mpBarX + 18 + BAR_W + 4, mpBarY, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#88aaff',
    }).setOrigin(0, 0.5).setDepth(DEPTH);

    // ── Weapon / spell names (top strip, center) ───────────────────────────────
    scene.add.text(480, 14, character.attackName, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffcc00',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH);

    scene.add.text(480, 30, character.spellName, {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH);

    // ── Key slots (top-right) ──────────────────────────────────────────────────
    const keyLabels: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold'];
    this.keyRects = keyLabels.map((label, i) => {
      const kx = 820 + i * 32;
      const ky = 24;
      const r = scene.add.rectangle(kx, ky, 24, 24, 0x222222)
        .setStrokeStyle(1.5, this.keyActiveColors[i])
        .setDepth(DEPTH);
      scene.add.text(kx, ky + 18, label.slice(0, 2).toUpperCase(), {
        fontFamily: 'monospace', fontSize: '8px', color: '#555555',
      }).setOrigin(0.5, 0).setDepth(DEPTH);
      return r;
    });

    // ── Bottom bar (y 592–640) ─────────────────────────────────────────────────
    scene.add.rectangle(480, 616, 960, 48, 0x111111).setDepth(DEPTH - 1);

    this.roomNameText = scene.add.text(480, 614, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#888888',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH);

    // Seed initial values
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
