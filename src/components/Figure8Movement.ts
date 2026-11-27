import Entity from "../entities/Entity.ts";
import IPatternMovement from "./IPatternMovement.ts";
import Oscillation from "../utils/Oscillation.ts";
import {Figure8MovementData} from "../gameData/MovementData.ts";

// Draws a horizontal "8" around its starting position
export default class Figure8Movement implements IPatternMovement {
    public enabled: boolean = true;

    // The vertical back and forth is twice as fast as the horizontal one: that draws an "8"
    private static readonly VERTICAL_FREQUENCY_RATIO: number = 2;

    private readonly _data: Figure8MovementData;
    private _originX: number = 0;
    private _originY: number = 0;
    private _elapsedTime: number = 0;

    public constructor(data: Figure8MovementData) {
        this._data = data;
    }

    public reset(entity: Entity) {
        this._originX = entity.x;
        this._originY = entity.y;
        this._elapsedTime = 0;
    }

    public move(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        this._elapsedTime += deltaTime;

        const phase: number = Oscillation.getPhase(this._data.frequency, this._elapsedTime);
        entity.x = this._originX + Math.sin(phase) * this._data.amplitudeX;
        entity.y = this._originY + Math.sin(phase * Figure8Movement.VERTICAL_FREQUENCY_RATIO) * this._data.amplitudeY;
    }
}
