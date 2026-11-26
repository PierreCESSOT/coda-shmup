import {BulletConfigData} from "./BulletConfigData.ts";

export type StreakData = {
    killsRequired: number;      // Kills in a row, without being hit, to unlock the laser
    laser: LaserData;
}

export type LaserData = {
    fireRate: number;           // Time between two shots, in seconds
    sound: string;
    glowColor: string;
    bullet: BulletConfigData;
}
