import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import {SineMovementData} from "../gameData/SineMovementData.ts";

// Moves an entity down while it oscillates horizontally around its spawn point
export default class SineMovement implements IComponent {
    public enabled: boolean = true;

    private readonly _data: SineMovementData;
    private _originX: number = 0;
    private _elapsedTime: number = 0;

    public constructor(data: SineMovementData) {
        this._data = data;
    }

    // Must be called on spawn, as pooled entities are reused
    public reset(originX: number) {
        this._originX = originX;
        this._elapsedTime = 0;
    }

    public move(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        this._elapsedTime += deltaTime;

        const phase: number = Phaser.Math.PI2 * this._data.frequency * (this._elapsedTime / 1000);
        entity.x = this._originX + Math.sin(phase) * this._data.amplitude;
        entity.y += this._data.speed * deltaTime;
    }
}
