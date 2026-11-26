import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import {SpreadPatternData} from "../gameData/SpreadShotData.ts";
import Entity from "../entities/Entity.ts";
import Weapon from "./Weapon.ts";

// Fires several bullets at once, fanned out around the source forward direction
export default class SpreadWeapon extends Weapon {
    private static readonly FULL_CIRCLE_DEGREES: number = 360;

    private readonly _pattern: SpreadPatternData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData, pattern: SpreadPatternData) {
        super(bullets, bulletData);

        this._pattern = pattern;
    }

    public shoot(source: Entity) {
        this.shootAt(source, source.rotation);
    }

    // Fires the spread shot centered on the given direction (in radians)
    public shootAt(source: Entity, direction: number) {
        if (!this.enabled)
            return;

        for (const bulletAngle of this.getBulletAngles(direction)) {
            this.fireBullet(source, bulletAngle);
        }
    }

    private getBulletAngles(direction: number): number[] {
        const count: number = Math.max(1, Math.floor(this._pattern.count));
        if (count === 1)
            return [direction];

        const spreadAngle: number = Phaser.Math.DegToRad(this._pattern.angle);
        const isFullCircle: boolean = this._pattern.angle >= SpreadWeapon.FULL_CIRCLE_DEGREES;

        // On a full circle, the first and last bullets would overlap: divide by count instead of count - 1
        const step: number = isFullCircle ? spreadAngle / count : spreadAngle / (count - 1);
        const startAngle: number = isFullCircle ? direction : direction - spreadAngle / 2;

        return Array.from({length: count}, (_, index) => startAngle + index * step);
    }
}
