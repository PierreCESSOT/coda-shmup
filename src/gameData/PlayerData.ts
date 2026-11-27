import {RangeData} from "./RangeData.ts";

export type PlayerData = {
    maxHealthCap: number;       // The max health can not go over this value
    contactDamage: number;      // Damage taken when touching an enemy
    killHeal: number;           // Health given back for each small enemy killed
    healthBonus: PlayerHealthBonusData;
}

// Rewards that raise the max health and heal the same amount (in health points, drawn at random between min and max)
export type PlayerHealthBonusData = {
    boss: RangeData;            // When a boss dies
    ultraBoss: RangeData;       // When an ultra boss dies
}
