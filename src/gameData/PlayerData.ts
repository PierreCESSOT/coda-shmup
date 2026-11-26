export type PlayerData = {
    health: number;
    contactDamage: number;      // Damage taken when colliding with an enemy
    heal: PlayerHealData;
}

// Health given back, as a random percentage of the max health, capped at the max
export type PlayerHealData = {
    streak: HealRangeData;      // When a kill streak starts
    boss: HealRangeData;        // When a boss is killed
    ultraBoss: HealRangeData;   // When an ultra boss is killed
}

export type HealRangeData = {
    min: number;                // In percent of the max health
    max: number;
}
