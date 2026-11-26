import {BulletConfigData} from "./BulletConfigData.ts";

// Forme d'un éventail : combien de balles, sur quel angle
export type SpreadData = {
    count: number;              // Nombre de balles tirées d'un coup
    angle: number;              // Angle total de l'éventail, en degrés (360 = cercle complet)
}

// Forme d'un tir en éventail, avec ses balles
export type SpreadPatternData = SpreadData & {
    bullet: BulletConfigData;
}

export type SpreadShotData = SpreadPatternData & {
    delay: number;              // Temps entre deux tirs, en millisecondes
}
