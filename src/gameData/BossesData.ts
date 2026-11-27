import {BossMovementData} from "./MovementData.ts";
import {SpreadPatternData} from "./SpreadShotData.ts";

export type BossesData = {
    scoreInterval: number;          // Points to score after a boss dies before the next one appears
    healthGrowthPerCycle: number;   // Extra health ratio each time all the bosses have been beaten
    finisher: FinisherData;
    bosses: BossData[];             // Bosses appear in this order, then loop
}

export type BossData = {
    name: string;
    texture: string;
    tint: string | null;            // "#rrggbb" to tint the texture, or null
    scale: number;
    health: number;
    entry: BossEntryData;
    movement: BossMovementData;
    attackDelay: number;            // Time between two attacks, in milliseconds
    attacks: BossAttackData[];      // Attacks are used in this order, then loop
}

export type BossEntryData = {
    speed: number;                  // Speed while entering the screen, in pixels per millisecond
    targetY: number;                // Height where the boss stops and starts its movement
}

export type BossAttackData = SpreadPatternData & {
    aimAtPlayer: boolean;           // Center the spread on the player instead of shooting straight
}

export type FinisherData = {
    healthThreshold: number;        // Share of health under which bullets do nothing: the laser is needed
    chargeTime: number;             // Time to hold the key to charge the laser, in seconds
    beamWidth: number;
    color: string;
}
