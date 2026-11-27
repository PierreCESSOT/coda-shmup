import {EnemySpawnData} from "./EnemySpawnData.ts";
import {SineMovementData} from "./SineMovementData.ts";
import {SpreadShotData} from "./SpreadShotData.ts";
import {BulletConfigData} from "./BulletConfigData.ts";

export type EnemiesData = {
    ufoEnemy: UfoEnemyData;
    sineEnemy: SineEnemyData;
}

// The red UFO of the course: only its bullets are set here
export type UfoEnemyData = {
    bullet: BulletConfigData;
}

export type SineEnemyData = {
    texture: string;
    health: number;
    spawn: EnemySpawnData;
    movement: SineMovementData;
    spreadShot: SpreadShotData;
}
