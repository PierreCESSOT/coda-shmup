import {BulletConfigData} from "./BulletConfigData.ts";
import {RangeData} from "./RangeData.ts";
import {SpreadData} from "./SpreadShotData.ts";

export type PowerUpsData = {
    dropChance: RangeData;      // Chance qu'un ennemi tué lâche un bonus, tirée au hasard à chaque fois (0.3 = 30 %). Un boss en lâche toujours un
    fallSpeed: number;          // Vitesse de chute du bonus, en pixels par milliseconde
    powerUps: PowerUpData[];    // Le bonus lâché est tiré au hasard dans cette liste
    combos: PowerUpComboData[]; // Ce que donnent deux bonus différents attrapés l'un après l'autre
    comboPartBonus: number;     // Pendant un combo, attraper un de ses deux bonus ajoute cette part de sa durée (0.25 = 25 %)
}

/**
 * Les effets d'un bonus. Chaque effet est optionnel : un bonus peut en combiner plusieurs.
 */
export type PowerUpEffects = {
    name: string;                   // Affiché à l'écran avec le temps restant
    color: string;                  // "#rrggbb" : couleur du texte et du halo du vaisseau
    damageMultiplier?: number;      // Dégâts des tirs multipliés
    weapon?: PowerUpWeaponData;     // Change le type de tir
    fireRateMultiplier?: number;    // Temps entre deux tirs multiplié (0.5 = tire 2 fois plus vite)
    spread?: SpreadData;            // Chaque tir part en éventail
    piercing?: boolean;             // Les tirs traversent les ennemis
    shield?: number;                // PV temporaires, perdus à la fin du bonus
    ram?: boolean;                  // Foncer dans les petits ennemis les détruit sans subir de dégâts
    speedMultiplier?: number;       // Vitesse du vaisseau multipliée
    shockwave?: ShockwaveData;      // Onde de choc lâchée au moment où on atteint ce niveau
}

/**
 * Ce qu'on peut activer dans le PowerUpSlot du joueur : un bonus ou un combo.
 * Ses effets de base (niveau 1), et ce qui change si on le ramasse encore pendant qu'il est actif.
 */
export type PowerUpDefinition = PowerUpEffects & {
    id: string;
    duration: RangeData;            // En secondes, tirée au hasard quand il est activé
    levels?: PowerUpLevelData[];    // levels[0] = niveau 2, levels[1] = niveau 3
}

// Un bonus qui tombe des ennemis
export type PowerUpData = PowerUpDefinition & {
    texture: string;
}

// Un combo : deux bonus différents attrapés l'un après l'autre fusionnent en celui-ci
export type PowerUpComboData = PowerUpDefinition & {
    parts: string[];                // Les "id" des deux bonus qui le donnent, dans n'importe quel ordre
}

// Un niveau ajoute ou remplace des effets ; il garde ceux des niveaux d'avant
export type PowerUpLevelData = Partial<PowerUpEffects> & {
    name: string;
    extraDuration?: number;         // Secondes ajoutées au temps restant en atteignant ce niveau
}

export type PowerUpWeaponData = {
    fireRate: number;               // Temps entre deux tirs, en secondes
    sound: string;
    bullet: BulletConfigData;
}

export type ShockwaveData = {
    speed: number;                  // Vitesse à laquelle l'onde grandit, en pixels par milliseconde
    maxRadius: number;              // Taille maximum, en pixels
    bossDamage: number;             // Dégâts aux boss (les petits ennemis et les balles sont détruits)
    color: string;
}

// Les effets d'un bonus à un niveau donné : ceux de base, puis ceux de chaque niveau jusqu'à celui-là
export function getPowerUpEffects(powerUp: PowerUpDefinition, level: number): PowerUpEffects {
    const {id: _id, duration: _duration, levels, ...extra} = powerUp;
    const {texture: _texture, parts: _parts, ...effects} = extra as Partial<PowerUpData & PowerUpComboData>;
    const result: PowerUpEffects = {...effects} as PowerUpEffects;

    for (let i: number = 0; i < level - 1 && levels && i < levels.length; i++) {
        const {extraDuration: _extraDuration, ...levelEffects} = levels[i];
        // Une onde de choc n'est lâchée qu'au niveau où elle est écrite
        delete result.shockwave;
        Object.assign(result, levelEffects);
    }

    return result;
}

// Le niveau maximum d'un bonus
export function getPowerUpMaxLevel(powerUp: PowerUpDefinition): number {
    return 1 + (powerUp.levels?.length ?? 0);
}
