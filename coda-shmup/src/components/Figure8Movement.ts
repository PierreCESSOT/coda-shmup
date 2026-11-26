import Entity from "../entities/Entity.ts";
import IPatternMovement from "./IPatternMovement.ts";
import {Figure8MovementData} from "../gameData/MovementData.ts";

// Dessine un "8" couché autour de sa position de départ
export default class Figure8Movement implements IPatternMovement {
    public enabled: boolean = true;

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

        const phase: number = Phaser.Math.PI2 * this._data.frequency * (this._elapsedTime / 1000);
        entity.x = this._originX + Math.sin(phase) * this._data.amplitudeX;
        // Aller-retour vertical deux fois plus rapide que l'horizontal : ça dessine un "8"
        entity.y = this._originY + Math.sin(phase * 2) * this._data.amplitudeY;
    }
}
