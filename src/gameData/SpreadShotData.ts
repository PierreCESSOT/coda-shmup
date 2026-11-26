import {BulletConfigData} from "./BulletConfigData.ts";

// How the bullets of a single spread shot are fanned out
export type SpreadPatternData = {
    count: number;              // Number of bullets fired at once
    angle: number;              // Total angle covered by the bullets, in degrees (360 = full circle)
    bullet: BulletConfigData;
}

export type SpreadShotData = SpreadPatternData & {
    delay: number;              // Time between two shots, in milliseconds
}
