import {BulletConfigData} from "./BulletConfigData.ts";

export type SpreadShotData = {
    count: number;              // Number of bullets fired at once
    angle: number;              // Total angle covered by the bullets, in degrees (360 = full circle)
    delay: number;              // Time between two shots, in milliseconds
    bullet: BulletConfigData;
}

