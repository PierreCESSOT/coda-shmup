import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import {SpreadShotData} from "../gameData/SpreadShotData.ts";
import Entity from "../entities/Entity.ts";
import Weapon from "./Weapon.ts";

// Fires several bullets at once, fanned out around the source forward direction
export default class SpreadWeapon extends Weapon {
    private readonly _spreadShotData: SpreadShotData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData, spreadShotData: SpreadShotData) {
        super(bullets, bulletData);

        this._spreadShotData = spreadShotData;
    }

    public shoot(source: Entity) {
        if (!this.enabled)
            return;

        const count: number = Math.max(1, Math.floor(this._spreadShotData.count));
        if (count === 1) {
            this.fireBullet(source, source.rotation);
            return;
        }

        const spreadAngle: number = Phaser.Math.DegToRad(this._spreadShotData.angle);
        const isFullCircle: boolean = this._spreadShotData.angle >= 360;

        // On a full circle, the first and last bullets would overlap: divide by count instead of count - 1
        const step: number = isFullCircle ? spreadAngle / count : spreadAngle / (count - 1);
        const startAngle: number = isFullCircle ? source.rotation : source.rotation - spreadAngle / 2;

        for (let i: number = 0; i < count; i++) {
            this.fireBullet(source, startAngle + i * step);
        }
    }
}
