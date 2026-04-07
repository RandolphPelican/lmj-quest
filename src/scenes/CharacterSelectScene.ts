import Phaser from 'phaser';
import { CHARACTERS, CharacterDefinition } from '../shared/characters';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private panels: Phaser.GameObjects.Container[] = [];
  private selectionBorders: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Title
    this.add
      .text(width / 2, 30, 'CHOOSE YOUR HERO', {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5);

    // Layout: 5 panels in a row across 800px width
    // Each panel is 140px wide with 12px gaps
    const panelWidth = 140;
    const panelHeight = 380;
    const gap = 12;
    const totalWidth = panelWidth * 5 + gap * 4;
    const startX = (width - totalWidth) / 2 + panelWidth / 2;
    const panelY = 260;

    CHARACTERS.forEach((char, index) => {
      const x = startX + index * (panelWidth + gap);
      const panel = this.createCharacterPanel(x, panelY, char, panelWidth, panelHeight);
      this.panels.push(panel);

      // Selection border (hidden unless selected)
      const border = this.add.rectangle(x, panelY, panelWidth + 6, panelHeight + 6);
      border.setStrokeStyle(3, 0xffcc00);
      border.setFillStyle();
      border.setVisible(index === this.selectedIndex);
      this.selectionBorders.push(border);

      // Make panel clickable
      const hitArea = this.add
        .rectangle(x, panelY, panelWidth, panelHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.selectCharacter(index);
      });
    });

    // Instructions
    this.add
      .text(width / 2, height - 75, 'CLICK A HERO OR PRESS 1-5   •   ENTER TO CONFIRM', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0.5);

    // Confirm button
    const confirmBtn = this.add
      .rectangle(width / 2, height - 40, 240, 40, 0x2a9d3f)
      .setInteractive({ useHandCursor: true });
    confirmBtn.setStrokeStyle(2, 0xffffff);

    this.add
      .text(width / 2, height - 40, 'START QUEST', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    confirmBtn.on('pointerdown', () => {
      this.confirmSelection();
    });

    // Keyboard input
    this.input.keyboard?.on('keydown-ONE', () => this.selectCharacter(0));
    this.input.keyboard?.on('keydown-TWO', () => this.selectCharacter(1));
    this.input.keyboard?.on('keydown-THREE', () => this.selectCharacter(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.selectCharacter(3));
    this.input.keyboard?.on('keydown-FIVE', () => this.selectCharacter(4));
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.selectCharacter((this.selectedIndex - 1 + 5) % 5);
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.selectCharacter((this.selectedIndex + 1) % 5);
    });
    this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());
  }

  private createCharacterPanel(
    x: number,
    y: number,
    char: CharacterDefinition,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Panel background
    const bg = this.add.rectangle(0, 0, width, height, 0x1a1a1a);
    bg.setStrokeStyle(1, 0x444444);
    container.add(bg);

    // Character avatar zone (top of panel)
    const avatarY = -height / 2 + 70;
    const avatar = this.createCharacterAvatar(char);
    avatar.setPosition(0, avatarY);
    container.add(avatar);

    // Name
    const nameText = this.add
      .text(0, -height / 2 + 135, char.name, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    container.add(nameText);

    // Title (role)
    const titleText = this.add
      .text(0, -height / 2 + 158, char.title, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffcc00',
      })
      .setOrigin(0.5);
    container.add(titleText);

    // Stat block
    const statsStartY = -height / 2 + 190;
    const statLineHeight = 16;
    const stats = [
      { label: 'HP  ', value: char.stats.hp, color: '#ff4444' },
      { label: 'MP  ', value: char.stats.mp, color: '#44aaff' },
      { label: 'SPD ', value: char.stats.speed, color: '#44ff88' },
      { label: 'DMG ', value: char.stats.damage, color: '#ffaa44' },
    ];

    stats.forEach((stat, i) => {
      const statText = this.add
        .text(-width / 2 + 12, statsStartY + i * statLineHeight, `${stat.label}${stat.value}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: stat.color,
        })
        .setOrigin(0, 0);
      container.add(statText);
    });

    // Divider
    const divider = this.add.rectangle(0, statsStartY + 4 * statLineHeight + 6, width - 20, 1, 0x444444);
    container.add(divider);

    // Attack + Spell
    const atkY = statsStartY + 4 * statLineHeight + 16;
    const atkText = this.add
      .text(-width / 2 + 12, atkY, `ATK: ${char.attackName}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#cccccc',
      })
      .setOrigin(0, 0);
    container.add(atkText);

    const spellText = this.add
      .text(-width / 2 + 12, atkY + 14, `SPL: ${char.spellName}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#cccccc',
      })
      .setOrigin(0, 0);
    container.add(spellText);

    // Description (wrapped)
    const descText = this.add
      .text(0, height / 2 - 30, char.description, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#888888',
        align: 'center',
        wordWrap: { width: width - 16 },
      })
      .setOrigin(0.5);
    container.add(descText);

    return container;
  }

  private createCharacterAvatar(char: CharacterDefinition): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    switch (char.id) {
      case 'lincoln': {
        // Blue knight: body rect, helmet rect, eyes, sword triangle
        const body = this.add.rectangle(0, 5, 32, 40, char.primaryColor);
        const helmet = this.add.rectangle(0, -20, 28, 14, char.accentColor);
        const eyeL = this.add.circle(-5, -20, 2, 0xffffff);
        const eyeR = this.add.circle(5, -20, 2, 0xffffff);
        const sword = this.add.triangle(22, 5, 0, -15, 0, 15, 10, 0, 0xcccccc);
        container.add([body, helmet, eyeL, eyeR, sword]);
        break;
      }
      case 'journey': {
        // Purple rogue: narrow body, green hood triangle, eyes, bow
        const body = this.add.rectangle(0, 5, 26, 40, char.primaryColor);
        const hood = this.add.triangle(0, -22, -16, 8, 16, 8, 0, -14, char.accentColor);
        const eyeL = this.add.circle(-4, -15, 2, 0xffffff);
        const eyeR = this.add.circle(4, -15, 2, 0xffffff);
        // Bow: curved via two thin rectangles
        const bowTop = this.add.rectangle(18, -2, 3, 14, 0x6b3410).setRotation(-0.3);
        const bowBot = this.add.rectangle(18, 12, 3, 14, 0x6b3410).setRotation(0.3);
        container.add([body, hood, eyeL, eyeR, bowTop, bowBot]);
        break;
      }
      case 'noah': {
        // Teal mage: body, tall pointed hat, star on hat, eyes, staff
        const body = this.add.rectangle(0, 8, 28, 36, char.primaryColor);
        const hat = this.add.triangle(0, -22, -14, 6, 14, 6, 0, -28, char.accentColor);
        const star = this.add.star(0, -14, 5, 2, 4, 0xffcc00);
        const eyeL = this.add.circle(-5, -4, 2, 0xffffff);
        const eyeR = this.add.circle(5, -4, 2, 0xffffff);
        const staff = this.add.rectangle(18, 4, 3, 34, 0x6b3410);
        const orb = this.add.circle(18, -14, 5, 0xcc44ff);
        container.add([body, hat, star, eyeL, eyeR, staff, orb]);
        break;
      }
      case 'bear': {
        // Brown tank: chunky body, shield square, eyes, axe
        const body = this.add.rectangle(0, 5, 44, 46, char.primaryColor);
        const shield = this.add.rectangle(-20, 5, 14, 24, char.accentColor);
        const shieldBoss = this.add.circle(-20, 5, 3, 0xaaaaaa);
        const eyeL = this.add.circle(-3, -5, 2, 0xffffff);
        const eyeR = this.add.circle(7, -5, 2, 0xffffff);
        const axeHandle = this.add.rectangle(22, 5, 3, 28, 0x6b3410);
        const axeHead = this.add.triangle(26, -5, 0, 0, 10, -4, 10, 8, 0xaaaaaa);
        container.add([body, shield, shieldBoss, eyeL, eyeR, axeHandle, axeHead]);
        break;
      }
      case 'dad': {
        // Rasta barbarian: fat gold circle body, red beard, green club, eyes
        const body = this.add.circle(0, 8, 26, char.primaryColor);
        const beard = this.add.circle(0, 16, 14, char.accentColor);
        const eyeL = this.add.circle(-7, -2, 2, 0xffffff);
        const eyeR = this.add.circle(7, -2, 2, 0xffffff);
        // Green club
        const clubHandle = this.add.rectangle(22, 8, 4, 28, 0x6b3410);
        const clubHead = this.add.rectangle(22, -8, 12, 14, 0x2a9d3f);
        container.add([body, beard, eyeL, eyeR, clubHandle, clubHead]);
        break;
      }
    }

    return container;
  }

  private selectCharacter(index: number): void {
    this.selectedIndex = index;
    this.selectionBorders.forEach((border, i) => {
      border.setVisible(i === index);
    });
  }

  private confirmSelection(): void {
    const selected = CHARACTERS[this.selectedIndex];
    this.scene.start('GameScene', { character: selected });
  }
}