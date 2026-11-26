import {MovementData} from "./MovementData.ts";
import {SpreadShotData} from "./SpreadShotData.ts";

export type EnemiesData = {
    [key: string]: EnemyData
}

export type EnemyData = {
    texture: string;
    spawnDelay: number;
    maxActive: number;
    movement: MovementData;
    spreadShot: SpreadShotData;
}