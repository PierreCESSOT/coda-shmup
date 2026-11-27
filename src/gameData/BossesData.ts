import {BossMovementData} from "./MovementData.ts";
import {SpreadPatternData} from "./SpreadShotData.ts";

export type BossesData = {
    scoreInterval: number;          // Points to score after a boss dies before the next one appears
    ultraEvery: number;             // One boss out of N is an ultra boss
    healthGrowthPerCycle: number;   // Extra health of every boss at each cycle (0.5 = +50 %)
    finisher: FinisherData;
    bosses: BossData[];             // Regular bosses, in order, then it starts again
    ultraBosses: BossData[];        // Ultra bosses, in order, then it starts again
}

export type BossData = {
    name: string;
    texture: string;
    tint: string | null;            // "#rrggbb" to tint the texture, or null
    scale: number;
    health: number;
    entry: BossEntryData;
    movement: BossMovementData;
    attacks: BossAttackData[];      // Attacks are used in this order, then loop
}

export type BossEntryData = {
    speed: number;                  // Speed while entering the screen, in pixels per millisecond
    targetY: number;                // Height where the boss stops and starts its movement
}

export type BossAttackData = SpreadPatternData & {
    delay: number;                  // Time before the next shot, in milliseconds
    repeat?: number;                // Number of shots in a row before the next attack (1 by default)
    aimAtPlayer?: boolean;          // Aim at the player instead of shooting straight ahead
    angleOffset?: number;           // Shifts the fan, in degrees
    mirrored?: boolean;             // Also fires on the other side (-angleOffset), like two claws
    spin?: number;                  // Rotation added to each shot, in degrees: draws a spiral
}

export type FinisherData = {
    healthThreshold: number;        // Share of health under which bullets do nothing: the laser is needed
    chargeTime: number;             // Time to hold the key to charge the laser, in seconds
    beamWidth: number;
    color: string;
}
