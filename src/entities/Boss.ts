import {Display} from 'phaser';
import BaseEnemy from './BaseEnemy.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import SineMovement from "../components/SineMovement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";
import GameConstants from "../GameConstants.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import type {BossAttackData, BossData} from "../gameData/BossesData.ts";

export type BossSetup = {
    bulletsGroup: Phaser.Physics.Arcade.Group;
    data: BossData;
    health: number;
    finisherThreshold: number;   // Health ratio under which only finish() can kill the boss
    target: Entity;              // What the aimed attacks shoot at
}

type BossAttack = {
    data: BossAttackData;
    weapon: SpreadWeapon;
}

// Enters the screen, then sways and cycles through its attacks.
// Under a health threshold, bullets no longer hurt it: only finish() can kill it
export default class Boss extends BaseEnemy {
    public static readonly FINISHER_READY_EVENT: string = 'finisherReady';

    private _data: BossData;
    private _target: Entity;
    private _attacks: BossAttack[] = [];
    private _attackIndex: number = 0;
    private _hasEntered: boolean = false;
    private _isFinisherReady: boolean = false;

    public get bossName(): string {
        return this._data.name;
    }

    public get isFinisherReady(): boolean {
        return this._isFinisherReady;
    }

    public init(setup: BossSetup) {
        this._data = setup.data;
        this._target = setup.target;

        this.setTexture(GameConstants.ATLAS_KEY, setup.data.texture);
        this.restoreAppearance();

        this.initHealth(setup.health);
        this.addComponent(new SineMovement(setup.data.movement));
        this.initAttacks(setup.bulletsGroup, setup.data.attacks);
        this.watchFinisherThreshold(setup.finisherThreshold);

        this.angle = BaseEnemy.FACING_DOWN_ANGLE;
        this.setScale(setup.data.scale);
        this.fitBodyToSprite();

        this.initShootTimer(setup.data.attackDelay);
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this._hasEntered = false;
    }

    // Called when the charged laser hits the boss
    public finish() {
        if (!this._isFinisherReady)
            return;

        const health = this.getComponent(Health)!;
        health.enabled = true;
        health.damage(health.current);
    }

    protected restoreAppearance() {
        if (this._data.tint)
            this.setTint(Display.Color.HexStringToColor(this._data.tint).color);
        else
            this.clearTint();
    }

    protected shoot() {
        if (!this._hasEntered || this._attacks.length === 0)
            return;

        const attack = this._attacks[this._attackIndex];
        this._attackIndex = (this._attackIndex + 1) % this._attacks.length;

        attack.weapon.shootAt(this, this.getAttackDirection(attack.data));
        this.scene.sound.play(GameConstants.AudioKeys.ENEMY_SHOOT);
    }

    protected move(deltaTime: number) {
        if (this._hasEntered) {
            this.getComponent(SineMovement)?.move(this, deltaTime);
            return;
        }

        this.moveIntoPosition(deltaTime);
    }

    private initAttacks(bulletsGroup: Phaser.Physics.Arcade.Group, attacksData: BossAttackData[]) {
        for (const attackData of attacksData) {
            const weapon = new SpreadWeapon(bulletsGroup, toBulletData(attackData.bullet), attackData);
            this._attacks.push({data: attackData, weapon});
            this.addComponent(weapon);
        }
    }

    private watchFinisherThreshold(finisherThreshold: number) {
        const health = this.getComponent(Health)!;
        health.on(Health.CHANGE_EVENT, (current: number) => {
            if (this._isFinisherReady || current <= 0 || current > health.max * finisherThreshold)
                return;

            this._isFinisherReady = true;
            // Bullets are now ignored: the boss has to be finished with the laser
            health.enabled = false;
            this.emit(Boss.FINISHER_READY_EVENT, this);
        });
    }

    // Body circle in texture space, centered: arcade bodies follow the sprite scale
    private fitBodyToSprite() {
        const radius: number = Math.min(this.width, this.height) / 2;
        this.arcadeBody.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    }

    private getAttackDirection(attack: BossAttackData): number {
        const shouldAimAtTarget: boolean = attack.aimAtPlayer && this._target.active;
        if (!shouldAimAtTarget)
            return this.rotation;

        return Phaser.Math.Angle.Between(this.x, this.y, this._target.x, this._target.y);
    }

    private moveIntoPosition(deltaTime: number) {
        const entry = this._data.entry;
        this.y += entry.speed * deltaTime;

        if (this.y < entry.targetY)
            return;

        this.y = entry.targetY;
        this._hasEntered = true;
        this.getComponent(SineMovement)?.reset(this.x);
    }
}
