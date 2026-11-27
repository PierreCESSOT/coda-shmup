import {Display} from 'phaser';
import {BulletData} from "./BulletData.ts";

// Same as BulletData, but JSON can't store hex numbers: the color is a "#rrggbb" string
export type BulletConfigData = {
    width: number;
    height: number;
    color: string;
    speed: number;
    damage: number;
    bossDamageMultiplier?: number;  // Damage multiplier against bosses (1 by default)
}

export function toBulletData(config: BulletConfigData): BulletData {
    return {
        ...config,
        color: Display.Color.HexStringToColor(config.color).color
    };
}
