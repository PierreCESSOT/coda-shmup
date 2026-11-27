export type BulletData = {
    width: number;
    height: number;
    color: number;
    speed: number;
    damage: number;
    bossDamageMultiplier?: number;  // Damage multiplier against bosses (1 by default)
    piercing?: boolean;             // The bullet goes through the enemies instead of stopping at the first one
}
