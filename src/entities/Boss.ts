import {Display} from 'phaser';
import BaseEnemy from './BaseEnemy.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import SineMovement from "../components/SineMovement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import type {BossAttackData, BossData} from "../gameData/BossesData.ts";

// Enters the screen, then sways and cycles through its attacks.
// Under a health threshold, bullets no longer hurt it: only finish() can kill it
export default class Boss extends BaseEnemy {
    public static readonly FINISHER_READY_EVENT: string = 'finisherReady';

    private _data: BossData;
    private _target: Entity;
    private _attacks: { data: BossAttackData, weapon: SpreadWeapon }[] = [];
    private _attackIndex: number = 0;
    private _hasEntered: boolean = false;
    private _isFinisherReady: boolean = false;

    public get bossName(): string {
        return this._data.name;
    }

    public get isFinisherReady(): boolean {
        return this._isFinisherReady;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: BossData, health: number,
                finisherThreshold: number, target: Entity) {
        this._data = data;
        this._target = target;

        this.setTexture('sprites', data.texture);
        this.restoreAppearance();

        this.initHealth(health);
        this.addComponent(new SineMovement(data.movement));
        for (const attackData of data.attacks) {
            const weapon = new SpreadWeapon(bulletsGroup, toBulletData(attackData.bullet), attackData);
            this._attacks.push({data: attackData, weapon: weapon});
            this.addComponent(weapon);
        }

        const bossHealth = this.getComponent(Health)!;
        bossHealth.on(Health.CHANGE_EVENT, (current: number) => {
            if (!this._isFinisherReady && current > 0 && current <= bossHealth.max * finisherThreshold) {
                this._isFinisherReady = true;
                // Bullets are now ignored: the boss has to be finished with the laser
                bossHealth.enabled = false;
                this.emit(Boss.FINISHER_READY_EVENT, this);
            }
        });

        this.angle = 90;
        this.setScale(data.scale);

        // Body circle in texture space, centered: arcade bodies follow the sprite scale
        const radius: number = Math.min(this.width, this.height) / 2;
        this.arcadeBody.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);

        this.initShootTimer(data.attackDelay);
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

        const direction: number = attack.data.aimAtPlayer && this._target.active
            ? Phaser.Math.Angle.Between(this.x, this.y, this._target.x, this._target.y)
            : this.rotation;
        attack.weapon.shootAt(this, direction);
        this.scene.sound.play('sfx_laser2');
    }

    protected move(deltaTime: number) {
        if (!this._hasEntered) {
            this.y += this._data.entry.speed * deltaTime;

            if (this.y >= this._data.entry.targetY) {
                this.y = this._data.entry.targetY;
                this._hasEntered = true;
                this.getComponent(SineMovement)?.reset(this);
            }
            return;
        }

        this.getComponent(SineMovement)?.move(this, deltaTime);
    }
}
