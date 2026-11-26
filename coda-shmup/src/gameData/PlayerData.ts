import {RangeData} from "./RangeData.ts";

export type PlayerData = {
    maxHealthCap: number;       // Les PV max ne peuvent pas dépasser cette valeur
    contactDamage: number;      // Dégâts reçus en touchant un ennemi
    killHeal: number;           // PV rendus à chaque petit ennemi éliminé
    healthBonus: PlayerHealthBonusData;
}

// Récompenses qui augmentent les PV max et soignent du même montant (en PV, tiré au hasard entre min et max)
export type PlayerHealthBonusData = {
    boss: RangeData;            // Quand un boss meurt
    ultraBoss: RangeData;       // Quand un boss ultra meurt
}
