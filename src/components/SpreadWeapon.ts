import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import {SpreadData} from "../gameData/SpreadShotData.ts";
import Entity from "../entities/Entity.ts";
import Weapon from "./Weapon.ts";

// Fires several bullets at once, fanned out around the source forward direction
export default class SpreadWeapon extends Weapon {
    private static readonly FULL_CIRCLE_DEGREES: number = 360;

    private _spread: SpreadData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData, spread: SpreadData) {
        super(bullets, bulletData);

        this._spread = spread;
    }

    // Changes the shape of the fan, e.g. to go from one bullet to three with a power-up
    public setSpread(spread: SpreadData) {
        this._spread = spread;
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
        const count: number = Math.max(1, Math.floor(this._spread.count));
        if (count === 1)
            return [direction];

        const spreadAngle: number = Phaser.Math.DegToRad(this._spread.angle);
        const isFullCircle: boolean = this._spread.angle >= SpreadWeapon.FULL_CIRCLE_DEGREES;

        // On a full circle, the first and last bullets would overlap: divide by count instead of count - 1
        const step: number = isFullCircle ? spreadAngle / count : spreadAngle / (count - 1);
        const startAngle: number = isFullCircle ? direction : direction - spreadAngle / 2;

        return Array.from({length: count}, (_, index) => startAngle + index * step);
    }
}
