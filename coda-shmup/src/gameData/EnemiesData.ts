import {EnemySpawnData} from "./EnemySpawnData.ts";
import {SineMovementData} from "./SineMovementData.ts";
import {SpreadShotData} from "./SpreadShotData.ts";
import {BulletConfigData} from "./BulletConfigData.ts";

export type EnemiesData = {
    ufoEnemy: UfoEnemyData;
    sineEnemy: SineEnemyData;
}

// L'UFO rouge du cours : seules ses balles sont réglées ici
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
