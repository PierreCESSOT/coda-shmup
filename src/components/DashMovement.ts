import Entity from "../entities/Entity.ts";
import IPatternMovement from "./IPatternMovement.ts";
import {DashMovementData} from "../gameData/MovementData.ts";

// Sways in place, then regularly dashes horizontally to the target position
export default class DashMovement implements IPatternMovement {
    public enabled: boolean = true;

    private readonly _data: DashMovementData;
    private readonly _target: Entity;
    private _originX: number = 0;
    private _elapsedTime: number = 0;
    private _timeUntilDash: number = 0;
    private _dashTargetX: number | null = null;

    public constructor(data: DashMovementData, target: Entity) {
        this._data = data;
        this._target = target;
    }

    public reset(entity: Entity) {
        this._originX = entity.x;
        this._elapsedTime = 0;
        this._timeUntilDash = this._data.delay;
        this._dashTargetX = null;
    }

    public move(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        if (this._dashTargetX !== null) {
            this.dash(entity, deltaTime);
            return;
        }

        this._elapsedTime += deltaTime;
        const phase: number = Phaser.Math.PI2 * this._data.frequency * (this._elapsedTime / 1000);
        entity.x = this._originX + Math.sin(phase) * this._data.amplitude;

        this._timeUntilDash -= deltaTime;
        if (this._timeUntilDash <= 0)
            this._dashTargetX = this._target.x;
    }

    private dash(entity: Entity, deltaTime: number) {
        const distance: number = this._dashTargetX! - entity.x;
        const step: number = this._data.speed * deltaTime;

        if (Math.abs(distance) <= step) {
            // Arrived: sway around the new position until the next dash
            entity.x = this._dashTargetX!;
            this.reset(entity);
            return;
        }

        entity.x += Math.sign(distance) * step;
    }
}
