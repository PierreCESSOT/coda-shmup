import {BulletConfigData} from "./BulletConfigData.ts";

// Shape of a fan of bullets: how many bullets, on which angle
export type SpreadData = {
    count: number;              // Number of bullets fired at once
    angle: number;              // Total angle of the fan, in degrees (360 = full circle)
}

// Shape of a spread shot, with its bullets
export type SpreadPatternData = SpreadData & {
    bullet: BulletConfigData;
}

export type SpreadShotData = SpreadPatternData & {
    delay: number;              // Time between two shots, in milliseconds
}
