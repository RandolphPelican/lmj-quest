export type LootType   = 'hp' | 'mp';
export type LootRarity = 'common' | 'uncommon' | 'rare';

export interface LootDefinition {
  id:      string;
  label:   string;
  type:    LootType;
  restore: number | 'full';
  rarity:  LootRarity;
  color:   number;
  weight:  number;
}

export const LOOT_TABLE: LootDefinition[] = [
  { id: 'yogurt',   label: 'Yogurt',            type: 'hp', restore: 15,     rarity: 'common',   color: 0xffffff, weight: 50 },
  { id: 'nuggets',  label: 'Chicken Nuggets',   type: 'hp', restore: 35,     rarity: 'uncommon', color: 0xd4a84b, weight: 25 },
  { id: 'pizza',    label: "TJ's Pizza",        type: 'hp', restore: 'full', rarity: 'rare',     color: 0xff6633, weight: 5  },
  { id: 'mp_small', label: 'MP Potion',         type: 'mp', restore: 20,     rarity: 'common',   color: 0x44aaff, weight: 40 },
  { id: 'mp_large', label: 'MP Potion (Large)', type: 'mp', restore: 'full', rarity: 'uncommon', color: 0x0055ff, weight: 15 },
];

// Pool filters for chest tiers
export const BRONZE_POOL = LOOT_TABLE.filter(l => l.rarity === 'common' || l.rarity === 'uncommon');
export const SILVER_POOL = LOOT_TABLE.filter(l => l.rarity === 'uncommon' || l.rarity === 'rare');
export const GOLD_POOL   = LOOT_TABLE; // reserved for Phase 4.4+

// Weighted random roll from a pool
export function rollLoot(pool: LootDefinition[]): LootDefinition {
  const total = pool.reduce((sum, l) => sum + l.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

// Enemy drop: 40% chance to drop a common-pool item
export function rollEnemyDrop(): LootDefinition | null {
  if (Math.random() > 0.4) return null;
  const commonPool = LOOT_TABLE.filter(l => l.rarity === 'common');
  return rollLoot(commonPool);
}
