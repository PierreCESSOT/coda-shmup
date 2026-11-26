import {Display} from 'phaser';
import BaseEnemy from './BaseEnemy.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import IPatternMovement from "../components/IPatternMovement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import type {BossAttackData, BossData, BossSummonData} from "../gameData/BossesData.ts";
import PatternMovementFactory from "../utils/PatternMovementFactory.ts";

type BossAttack = {
    data: BossAttackData;
    weapon: SpreadWeapon;
    spinAngle: number;      // Current rotation added by "spin", in radians
}

// Enters the screen, then follows its movement pattern and cycles through its attacks.
// Under a health threshold, bullets no longer hurt it: only finish() can kill it
export default class Boss extends BaseEnemy {
    public static readonly FINISHER_READY_EVENT: string = 'finisherReady';
    public static readonly SUMMON_EVENT: string = 'summon';

    private _data: BossData;
    private _target: Entity;
    private _isUltra: boolean;
    private _movement: IPatternMovement;
    private _attacks: BossAttack[] = [];
    private _attackIndex: number = 0;
    private _shotsLeft: number = 0;
    private _timeUntilAttack: number = 0;
    private _hasEntered: boolean = false;
    private _isFinisherReady: boolean = false;
    private _summonTimer: Phaser.Time.TimerEvent | undefined;

    public get bossName(): string {
        return this._data.name;
    }

    public get isUltra(): boolean {
        return this._isUltra;
    }

    public get isFinisherReady(): boolean {
        return this._isFinisherReady;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: BossData, health: number,
                finisherThreshold: number, target: Entity, isUltra: boolean) {
        this._data = data;
        this._target = target;
        this._isUltra = isUltra;

        this.setTexture('sprites', data.texture);
        this.restoreAppearance();

        this.initHealth(health);
        this._movement = PatternMovementFactory.create(data.movement, target);
        this.addComponent(this._movement);
        for (const attackData of data.attacks) {
            const weapon = new SpreadWeapon(bulletsGroup, toBulletData(attackData.bullet), attackData);
            this._attacks.push({data: attackData, weapon: weapon, spinAngle: 0});
            this.addComponent(weapon);
        }

        const bossHealth = this.getComponent(Health)!;
        bossHealth.on(Health.CHANGE_EVENT, (current: number) => this.onHealthChanged(bossHealth, current, finisherThreshold));

        this.angle = 90;
        this.setScale(data.scale);

        // Body circle in texture space, centered: arcade bodies follow the sprite scale
        const radius: number = Math.min(this.width, this.height) / 2;
        this.arcadeBody.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this._hasEntered = false;
        this._timeUntilAttack = 0;
        this.startAttack(0);
    }

    public disable() {
        super.disable();

        this.stopSummoning();
    }

    destroy(fromScene?: boolean) {
        this.stopSummoning();

        super.destroy(fromScene);
    }

    // Called when the charged laser hits the boss
    public finish() {
        if (!this._isFinisherReady)
            return;

        const health = this.getComponent(Health)!;
        health.enabled = true;
        health.damage(health.current);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        if (!this.active || !this._hasEntered)
            return;

        this._timeUntilAttack -= deltaTime;
        if (this._timeUntilAttack <= 0)
            this.shoot();
    }

    protected restoreAppearance() {
        if (this._data.tint)
            this.setTint(Display.Color.HexStringToColor(this._data.tint).color);
        else
            this.clearTint();
    }

    protected shoot() {
        if (this._attacks.length === 0)
            return;

        const attack = this._attacks[this._attackIndex];
        const isFirstShot: boolean = this._shotsLeft === (attack.data.repeat ?? 1);
        this.fire(attack, isFirstShot);

        this._timeUntilAttack = attack.data.delay;
        this._shotsLeft--;
        if (this._shotsLeft <= 0)
            this.startAttack((this._attackIndex + 1) % this._attacks.length);
    }

    protected move(deltaTime: number) {
        if (!this._hasEntered) {
            this.y += this._data.entry.speed * deltaTime;

            if (this.y >= this._data.entry.targetY) {
                this.y = this._data.entry.targetY;
                this._hasEntered = true;
                this._movement.reset(this);
            }
            return;
        }

        this._movement.move(this, deltaTime);
    }

    private startAttack(index: number) {
        this._attackIndex = index;
        this._shotsLeft = this._attacks[index]?.data.repeat ?? 1;
    }

    private fire(attack: BossAttack, playSound: boolean) {
        const baseDirection: number = attack.data.aimAtPlayer && this._target.active
            ? Phaser.Math.Angle.Between(this.x, this.y, this._target.x, this._target.y)
            : this.rotation;
        const offset: number = Phaser.Math.DegToRad(attack.data.angleOffset ?? 0) + attack.spinAngle;

        attack.weapon.shootAt(this, baseDirection + offset);
        if (attack.data.mirrored)
            attack.weapon.shootAt(this, baseDirection - offset);

        attack.spinAngle += Phaser.Math.DegToRad(attack.data.spin ?? 0);

        // One sound per attack sequence, not per bullet wave
        if (playSound)
            this.scene.sound.play('sfx_laser2');
    }

    private onHealthChanged(health: Health, current: number, finisherThreshold: number) {
        if (current <= 0)
            return;

        const summon = this._data.summon;
        if (summon && !this._summonTimer && current <= health.max * summon.healthThreshold)
            this.startSummoning(summon);

        if (!this._isFinisherReady && current <= health.max * finisherThreshold) {
            this._isFinisherReady = true;
            // Bullets are now ignored: the boss has to be finished with the laser
            health.enabled = false;
            this.emit(Boss.FINISHER_READY_EVENT, this);
        }
    }

    private startSummoning(summon: BossSummonData) {
        this.emit(Boss.SUMMON_EVENT, this, summon);
        this._summonTimer = this.scene.time.addEvent({
            delay: summon.delay,
            loop: true,
            callback: () => this.emit(Boss.SUMMON_EVENT, this, summon)
        });
    }

    private stopSummoning() {
        this._summonTimer?.remove();
        this._summonTimer = undefined;
    }
}
