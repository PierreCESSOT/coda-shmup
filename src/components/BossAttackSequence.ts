import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import SpreadWeapon from "./SpreadWeapon.ts";
import GameConstants from "../GameConstants.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import type {BossAttackData} from "../gameData/BossesData.ts";

// An attack of the boss, with the weapon that fires it
type Attack = {
    data: BossAttackData;
    weapon: SpreadWeapon;
    spinAngle: number;      // Rotation added by "spin" since the first shot, in radians
};

/**
 * Chains the attacks of a boss, in the order of the JSON file, then starts again.
 *
 * Each attack is fired "repeat" times, "delay" ms apart, then the next attack starts.
 */
export default class BossAttackSequence implements IComponent {
    public enabled: boolean = true;

    private readonly _attacks: Attack[];
    private readonly _target: Entity;
    private _index: number = 0;             // Current attack
    private _shotsLeft: number = 0;         // Shots left for the current attack
    private _timeUntilNextShot: number = 0; // In milliseconds

    public constructor(bullets: Phaser.Physics.Arcade.Group, attacksData: BossAttackData[], target: Entity) {
        this._target = target;
        this._attacks = attacksData.map(data => ({
            data,
            weapon: new SpreadWeapon(bullets, toBulletData(data.bullet), data),
            spinAngle: 0
        }));
    }

    // Starts again with the first attack, which is fired right away
    public reset() {
        this._timeUntilNextShot = 0;
        this.startAttack(0);
    }

    // To call every frame: fires when it is time
    public update(source: Entity, deltaTime: number) {
        if (!this.enabled || this._attacks.length === 0)
            return;

        this._timeUntilNextShot -= deltaTime;
        if (this._timeUntilNextShot > 0)
            return;

        const attack = this._attacks[this._index];
        // One sound per attack, otherwise the spirals make a continuous noise
        if (this._shotsLeft === this.getRepeatCount(attack))
            source.scene.sound.play(GameConstants.AudioKeys.ENEMY_SHOOT);
        this.fire(source, attack);

        this._timeUntilNextShot = attack.data.delay;
        this._shotsLeft--;
        if (this._shotsLeft <= 0)
            this.startAttack((this._index + 1) % this._attacks.length);
    }

    private startAttack(index: number) {
        this._index = index;
        this._shotsLeft = this.getRepeatCount(this._attacks[index]);
    }

    private getRepeatCount(attack: Attack | undefined): number {
        return attack?.data.repeat ?? 1;
    }

    private fire(source: Entity, attack: Attack) {
        const baseDirection: number = this.getBaseDirection(source, attack.data);
        const offset: number = Phaser.Math.DegToRad(attack.data.angleOffset ?? 0) + attack.spinAngle;

        attack.weapon.shootAt(source, baseDirection + offset);
        // "mirrored": also fire on the other side, like the two claws of the Hive Queen
        if (attack.data.mirrored)
            attack.weapon.shootAt(source, baseDirection - offset);

        // "spin": each shot is turned a bit more than the previous one, which draws a spiral
        attack.spinAngle += Phaser.Math.DegToRad(attack.data.spin ?? 0);
    }

    // Towards the player, or straight ahead of the boss
    private getBaseDirection(source: Entity, data: BossAttackData): number {
        const shouldAimAtTarget: boolean = (data.aimAtPlayer ?? false) && this._target.active;
        if (!shouldAimAtTarget)
            return source.rotation;

        return Phaser.Math.Angle.Between(source.x, source.y, this._target.x, this._target.y);
    }
}
