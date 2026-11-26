export type PlayerData = {
    health: number;             // Max health at the start of a run
    maxHealthCap: number;       // Max health can't grow past this value
    contactDamage: number;      // Damage taken when colliding with an enemy
    healthBonus: PlayerHealthBonusData;
}

// Rewards that raise the max health (and heal the same amount),
// as a random percentage of the starting health
export type PlayerHealthBonusData = {
    streak: PercentRangeData;   // When a kill streak starts
    boss: PercentRangeData;     // When a boss is killed
    ultraBoss: PercentRangeData;// When an ultra boss is killed
}

export type PercentRangeData = {
    min: number;
    max: number;
}
