export type SpreadShotData = {
    count: number;              // Number of bullets fired at once
    angle: number;              // Total angle covered by the bullets, in degrees (360 = full circle)
    delay: number;              // Time between two shots, in milliseconds
    bullet: BulletConfigData;
}

// Same as BulletData, but JSON can't store hex numbers: the color is a "#rrggbb" string
export type BulletConfigData = {
    width: number;
    height: number;
    color: string;
    speed: number;
    damage: number;
}
