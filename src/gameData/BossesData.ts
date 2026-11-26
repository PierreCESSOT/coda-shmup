import {BossMovementData} from "./MovementData.ts";
import {SpreadPatternData} from "./SpreadShotData.ts";

export type BossesData = {
    scoreInterval: number;          // Points to score after a boss dies before the next one appears
    ultraEvery: number;             // Every Nth boss is an ultra boss
    healthGrowthPerCycle: number;   // Extra health ratio for all bosses each time an ultra boss has been met
    finisher: FinisherData;
    bosses: BossData[];             // Regular bosses appear in this order, then loop
    ultraBosses: BossData[];        // Ultra bosses appear in this order, then loop
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
    summon?: BossSummonData;        // Optional: calls enemies for help when its health is low
}

export type BossEntryData = {
    speed: number;                  // Speed while entering the screen, in pixels per millisecond
    targetY: number;                // Height where the boss stops and starts its movement
}

export type BossAttackData = SpreadPatternData & {
    delay: number;                  // Time before the next shot, in milliseconds
    repeat?: number;                // Shots in a row before switching to the next attack (default 1)
    aimAtPlayer?: boolean;          // Center the spread on the player instead of shooting straight
    angleOffset?: number;           // Rotates the spread, in degrees
    mirrored?: boolean;             // Also fires the spread on the other side (-angleOffset)
    spin?: number;                  // Extra rotation added after each shot, in degrees: makes spirals
}

export type BossSummonData = {
    healthThreshold: number;        // Health ratio under which the boss starts summoning
    delay: number;                  // Time between two summons, in milliseconds
    count: number;                  // Enemies per summon
    enemy: 'ufo' | 'sine';
}

export type FinisherData = {
    healthThreshold: number;        // Health ratio under which bullets no longer hurt and the laser is needed
    chargeTime: number;             // Time to hold the key to charge the laser, in seconds
    beamWidth: number;
    color: string;
}
