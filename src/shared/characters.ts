export interface CharacterStats {
  hp: number;
  mp: number;
  speed: number;
  damage: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  stats: CharacterStats;
  attackName: string;
  spellName: string;
  primaryColor: number;
  accentColor: number;
}

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: 'lincoln',
    name: 'LINCOLN',
    title: 'The Balanced Knight',
    description: 'Strong of sword and true of heart.',
    stats: { hp: 100, mp: 40, speed: 100, damage: 20 },
    attackName: 'Sword Slash',
    spellName: 'Shield Bash',
    primaryColor: 0x3366ff,
    accentColor: 0x1a3d99,
  },
  {
    id: 'journey',
    name: 'JOURNEY',
    title: 'The Swift Ranger',
    description: 'Arrows fly where her gaze lands.',
    stats: { hp: 70, mp: 80, speed: 140, damage: 15 },
    attackName: 'Bow Shot',
    spellName: 'Triple Arrow',
    primaryColor: 0xaa44cc,
    accentColor: 0x2a9d3f,
  },
  {
    id: 'noah',
    name: 'NOAH',
    title: 'The Arcane Scholar',
    description: 'Low HP, big spells, zero regrets.',
    stats: { hp: 60, mp: 120, speed: 110, damage: 30 },
    attackName: 'Staff Bolt',
    spellName: 'Fireball',
    primaryColor: 0x22cccc,
    accentColor: 0x224488,
  },
  {
    id: 'bear',
    name: 'BEAR',
    title: 'The Unmovable',
    description: 'Takes the hit so the team can keep swinging.',
    stats: { hp: 150, mp: 30, speed: 70, damage: 18 },
    attackName: 'Axe Chop',
    spellName: 'Taunt Roar',
    primaryColor: 0x8b4513,
    accentColor: 0x4a2608,
  },
  {
    id: 'dad',
    name: 'DAD',
    title: 'The Rasta Barbarian',
    description: 'Slow, loud, and his farts are weapons of war.',
    stats: { hp: 180, mp: 60, speed: 60, damage: 22 },
    attackName: 'Club Smash',
    spellName: 'Atomic Dutch Oven',
    primaryColor: 0xffcc00,
    accentColor: 0xe63946,
  },
];