import {Display} from 'phaser';
import {BulletData} from "./BulletData.ts";

// Comme BulletData, mais le JSON ne gère pas les nombres hexadécimaux : la couleur est un texte "#rrggbb"
export type BulletConfigData = {
    width: number;
    height: number;
    color: string;
    speed: number;
    damage: number;
    bossDamageMultiplier?: number;  // Multiplicateur de dégâts contre les boss (1 par défaut)
}

export function toBulletData(config: BulletConfigData): BulletData {
    return {
        ...config,
        color: Display.Color.HexStringToColor(config.color).color
    };
}
