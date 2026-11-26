import {BossMovementData} from "./MovementData.ts";
import {SpreadPatternData} from "./SpreadShotData.ts";

export type BossesData = {
    scoreInterval: number;          // Points à marquer après la mort d'un boss avant le suivant
    ultraEvery: number;             // Un boss sur N est un boss ultra
    healthGrowthPerCycle: number;   // Vie en plus pour tous les boss à chaque cycle (0.5 = +50 %)
    finisher: FinisherData;
    bosses: BossData[];             // Boss normaux, dans l'ordre, puis ça recommence
    ultraBosses: BossData[];        // Boss ultra, dans l'ordre, puis ça recommence
}

export type BossData = {
    name: string;
    texture: string;
    tint: string | null;            // "#rrggbb" pour colorer le sprite, ou null
    scale: number;
    health: number;
    entry: BossEntryData;
    movement: BossMovementData;
    attacks: BossAttackData[];      // Attaques, dans l'ordre, puis ça recommence
    summon?: BossSummonData;        // Optionnel : appelle des renforts quand sa vie est basse
}

export type BossEntryData = {
    speed: number;                  // Vitesse de descente à l'entrée, en pixels par milliseconde
    targetY: number;                // Hauteur où il s'arrête et commence son mouvement
}

export type BossAttackData = SpreadPatternData & {
    delay: number;                  // Temps avant le tir suivant, en millisecondes
    repeat?: number;                // Nombre de tirs d'affilée avant l'attaque suivante (1 par défaut)
    aimAtPlayer?: boolean;          // Vise le joueur au lieu de tirer droit devant
    angleOffset?: number;           // Décale l'éventail, en degrés
    mirrored?: boolean;             // Tire aussi de l'autre côté (-angleOffset), comme deux pinces
    spin?: number;                  // Rotation ajoutée à chaque tir, en degrés : dessine une spirale
}

export type BossSummonData = {
    healthThreshold: number;        // Part de vie sous laquelle il commence à invoquer (0.5 = 50 %)
    delay: number;                  // Temps entre deux invocations, en millisecondes
    count: number;                  // Nombre d'ennemis par invocation
    enemy: 'ufo' | 'sine';
}

export type FinisherData = {
    healthThreshold: number;        // Part de vie sous laquelle les balles ne font plus rien : il faut le laser
    chargeTime: number;             // Temps à maintenir F pour charger le laser, en secondes
    beamWidth: number;
    color: string;
}
