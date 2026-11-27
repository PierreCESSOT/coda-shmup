import {BulletConfigData} from "./BulletConfigData.ts";
import {RangeData} from "./RangeData.ts";
import {SpreadData} from "./SpreadShotData.ts";

export type PowerUpsData = {
    dropChance: RangeData;      // Chance that a killed enemy drops a power-up, drawn at random each time (0.3 = 30 %). A boss always drops one
    fallSpeed: number;          // Falling speed of the power-up, in pixels per millisecond
    powerUps: PowerUpData[];    // The dropped power-up is drawn at random in this list
    combos: PowerUpComboData[]; // What two different power-ups caught one after the other give
    comboPartBonus: number;     // During a combo, catching one of its two power-ups adds this share of its duration (0.25 = 25 %)
}

/**
 * The effects of a power-up. Every effect is optional: a power-up can combine several of them.
 */
export type PowerUpEffects = {
    name: string;                   // Displayed on screen with the remaining time
    color: string;                  // "#rrggbb": color of the text and of the glow of the ship
    damageMultiplier?: number;      // Damage of the shots multiplied
    weapon?: PowerUpWeaponData;     // Changes the kind of shot
    fireRateMultiplier?: number;    // Time between two shots multiplied (0.5 = fires twice as fast)
    spread?: SpreadData;            // Every shot is a fan of bullets
    piercing?: boolean;             // The shots go through the enemies
    shield?: number;                // Temporary health, lost when the power-up ends
    ram?: boolean;                  // Ramming small enemies destroys them without taking damage
    speedMultiplier?: number;       // Speed of the ship multiplied
    shockwave?: ShockwaveData;      // Shockwave released when this level is reached
}

/**
 * What can be activated in the PowerUpSlot of the player: a power-up or a combo.
 * Its base effects (level 1), and what changes if it is caught again while it is active.
 */
export type PowerUpDefinition = PowerUpEffects & {
    id: string;
    duration: RangeData;            // In seconds, drawn at random when it is activated
    levels?: PowerUpLevelData[];    // levels[0] = level 2, levels[1] = level 3
}

// A power-up that falls from the enemies
export type PowerUpData = PowerUpDefinition & {
    texture: string;
}

// A combo: two different power-ups caught one after the other merge into this one
export type PowerUpComboData = PowerUpDefinition & {
    parts: string[];                // The "id" of the two power-ups that give it, in any order
}

// A level adds or replaces effects; it keeps the ones of the previous levels
export type PowerUpLevelData = Partial<PowerUpEffects> & {
    name: string;
    extraDuration?: number;         // Seconds added to the remaining time when this level is reached
}

export type PowerUpWeaponData = {
    fireRate: number;               // Time between two shots, in seconds
    sound: string;
    bullet: BulletConfigData;
}

export type ShockwaveData = {
    speed: number;                  // Speed at which the wave grows, in pixels per millisecond
    maxRadius: number;              // Maximum size, in pixels
    bossDamage: number;             // Damage to the bosses (small enemies and bullets are destroyed)
    color: string;
}

const EFFECT_KEYS: (keyof PowerUpEffects)[] = [
    'name', 'color', 'damageMultiplier', 'weapon', 'fireRateMultiplier', 'spread', 'piercing', 'shield', 'ram', 'speedMultiplier',
    'shockwave'
];

// Keeps only the effects of a power-up, of a combo or of a level
function pickEffects(source: Partial<PowerUpEffects>): Partial<PowerUpEffects> {
    const effects: Partial<PowerUpEffects> = {};
    for (const key of EFFECT_KEYS) {
        if (source[key] !== undefined)
            Object.assign(effects, {[key]: source[key]});
    }

    return effects;
}

// The effects of a power-up at a given level: the base ones, then the ones of each level up to that one
export function getPowerUpEffects(powerUp: PowerUpDefinition, level: number): PowerUpEffects {
    const effects: Partial<PowerUpEffects> = pickEffects(powerUp);

    const reachedLevels: PowerUpLevelData[] = (powerUp.levels ?? []).slice(0, level - 1);
    for (const levelData of reachedLevels) {
        // A shockwave is only released at the level where it is written
        delete effects.shockwave;
        Object.assign(effects, pickEffects(levelData));
    }

    return effects as PowerUpEffects;
}

// What a level adds to the power-up (levels[0] describes the level 2), or undefined for the level 1
export function getPowerUpLevelData(powerUp: PowerUpDefinition, level: number): PowerUpLevelData | undefined {
    return powerUp.levels?.[level - 2];
}

// The maximum level of a power-up
export function getPowerUpMaxLevel(powerUp: PowerUpDefinition): number {
    return 1 + (powerUp.levels?.length ?? 0);
}
