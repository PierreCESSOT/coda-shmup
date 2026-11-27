import {Display} from 'phaser';
import BaseEnemy from './BaseEnemy.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import IPatternMovement from "../components/IPatternMovement.ts";
import BossAttackSequence from "../components/BossAttackSequence.ts";
import GameConstants from "../GameConstants.ts";
import type {BossData} from "../gameData/BossesData.ts";
import PatternMovementFactory from "../utils/PatternMovementFactory.ts";

export type BossSetup = {
    bulletsGroup: Phaser.Physics.Arcade.Group;
    data: BossData;
    health: number;
    finisherThreshold: number;   // Share of health under which only finish() can kill the boss
    target: Entity;              // What the aimed attacks and the dash aim at
    isUltra: boolean;
}

// Enters the screen, then moves and attacks.
// Under a health threshold, bullets no longer hurt it: only finish() can kill it
export default class Boss extends BaseEnemy {
    public static readonly FINISHER_READY_EVENT: string = 'finisherReady';

    private _data: BossData;
    private _isUltra: boolean = false;
    private _movement: IPatternMovement;
    private _attackSequence: BossAttackSequence;
    private _hasEntered: boolean = false;
    private _isFinisherReady: boolean = false;

    public get bossName(): string {
        return this._data.name;
    }

    public get isUltra(): boolean {
        return this._isUltra;
    }

    public get isFinisherReady(): boolean {
        return this._isFinisherReady;
    }

    public init(setup: BossSetup) {
        this._data = setup.data;
        this._isUltra = setup.isUltra;

        this.setTexture(GameConstants.ATLAS_KEY, setup.data.texture);
        this.restoreAppearance();

        this.initHealth(setup.health);
        this._movement = PatternMovementFactory.create(setup.data.movement, setup.target);
        this.addComponent(this._movement);
        this._attackSequence = new BossAttackSequence(setup.bulletsGroup, setup.data.attacks, setup.target);
        this.addComponent(this._attackSequence);
        this.watchFinisherThreshold(setup.finisherThreshold);

        this.angle = BaseEnemy.FACING_DOWN_ANGLE;
        this.setScale(setup.data.scale);
        this.fitBodyToSprite();
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this._hasEntered = false;
        this._attackSequence.reset();
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

        // No attack while it enters the screen
        if (this.active && this._hasEntered)
            this._attackSequence.update(this, deltaTime);
    }

    protected restoreAppearance() {
        if (this._data.tint)
            this.setTint(Display.Color.HexStringToColor(this._data.tint).color);
        else
            this.clearTint();
    }

    protected move(deltaTime: number) {
        if (this._hasEntered) {
            this._movement.move(this, deltaTime);
            return;
        }

        this.moveIntoPosition(deltaTime);
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

    private moveIntoPosition(deltaTime: number) {
        const entry = this._data.entry;
        this.y += entry.speed * deltaTime;

        if (this.y < entry.targetY)
            return;

        this.y = entry.targetY;
        this._hasEntered = true;
        this._movement.reset(this);
    }
}
