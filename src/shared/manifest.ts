import type { KeyTier } from '../game/Inventory';
import { ALL_ROOMS } from './rooms';

export interface LevelManifest {
  levelId: string;
  // Guaranteed minimums the level must contain to be winnable
  requiredKeys:   Partial<Record<KeyTier, number>>;
  requiredChests: Partial<Record<KeyTier, number>>;
  // Locked doors that block progression (must have matching key count)
  lockedDoors:    Partial<Record<KeyTier, number>>;
}

export function validateManifest(manifest: LevelManifest): void {
  const errors: string[] = [];

  const keyCount:       Record<KeyTier, number> = { bronze: 0, silver: 0, gold: 0 };
  const chestCount:     Record<KeyTier, number> = { bronze: 0, silver: 0, gold: 0 };
  const lockedDoorCount: Record<KeyTier, number> = { bronze: 0, silver: 0, gold: 0 };

  for (const room of Object.values(ALL_ROOMS)) {
    for (const k of room.keys   ?? []) keyCount[k.tier]++;
    for (const c of room.chests ?? []) chestCount[c.tier]++;
    for (const row of room.layout) {
      for (const char of row) {
        if (char === 'L') lockedDoorCount.bronze++;
        if (char === 'M') lockedDoorCount.silver++;
        if (char === 'N') lockedDoorCount.gold++;
      }
    }
  }

  for (const [tier, required] of Object.entries(manifest.requiredKeys) as [KeyTier, number][]) {
    if (keyCount[tier] < required) {
      errors.push(`Level ${manifest.levelId}: needs ${required} ${tier} keys, found ${keyCount[tier]}`);
    }
  }

  for (const [tier, required] of Object.entries(manifest.requiredChests) as [KeyTier, number][]) {
    if (chestCount[tier] < required) {
      errors.push(`Level ${manifest.levelId}: needs ${required} ${tier} chests, found ${chestCount[tier]}`);
    }
  }

  for (const [tier, doors] of Object.entries(manifest.lockedDoors) as [KeyTier, number][]) {
    if (keyCount[tier] < doors) {
      errors.push(`Level ${manifest.levelId}: ${doors} ${tier} locked doors but only ${keyCount[tier]} ${tier} keys`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`MANIFEST VALIDATION FAILED:\n${errors.join('\n')}`);
  }

  console.log(`[Manifest] Level ${manifest.levelId} validated OK — keys: ${JSON.stringify(keyCount)}, chests: ${JSON.stringify(chestCount)}`);
}

export const LEVEL_1_MANIFEST: LevelManifest = {
  levelId:        'level_01',
  requiredKeys:   { bronze: 3 },
  requiredChests: { bronze: 4 },
  lockedDoors:    { bronze: 0 },
};
