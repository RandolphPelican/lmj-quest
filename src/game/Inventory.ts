export type KeyTier = 'bronze' | 'silver' | 'gold';

export class Inventory {
  private keys: Record<KeyTier, number> = { bronze: 0, silver: 0, gold: 0 };

  addKey(tier: KeyTier): void { this.keys[tier]++; }
  useKey(tier: KeyTier): boolean {
    if (this.keys[tier] <= 0) return false;
    this.keys[tier]--;
    return true;
  }
  getKeys(tier: KeyTier): number { return this.keys[tier]; }

  reset(): void { this.keys = { bronze: 0, silver: 0, gold: 0 }; }
}
