import {EnemySpawnData} from "./EnemySpawnData.ts";
import {SineMovementData} from "./SineMovementData.ts";
import {SpreadShotData} from "./SpreadShotData.ts";

export type EnemiesData = {
    sineEnemy: SineEnemyData;
}

export type SineEnemyData = {
    texture: string;
    health: number;
    spawn: EnemySpawnData;
    movement: SineMovementData;
    spreadShot: SpreadShotData;
}
