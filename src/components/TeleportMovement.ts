import Entity from "../entities/Entity.ts";
import IPatternMovement from "./IPatternMovement.ts";
import {TeleportMovementData} from "../gameData/MovementData.ts";

// Fades out, reappears somewhere else, and waits before the next teleport
export default class TeleportMovement implements IPatternMovement {
    public enabled: boolean = true;

    private readonly _data: TeleportMovementData;
    private _originY: number = 0;
    private _timeUntilTeleport: number = 0;
    private _isTeleporting: boolean = false;

    public constructor(data: TeleportMovementData) {
        this._data = data;
    }

    public reset(entity: Entity) {
        this._originY = entity.y;
        this._timeUntilTeleport = this._data.delay;
        this._isTeleporting = false;
        entity.setAlpha(1);
    }

    public move(entity: Entity, deltaTime: number) {
        if (!this.enabled || this._isTeleporting)
            return;

        this._timeUntilTeleport -= deltaTime;
        if (this._timeUntilTeleport <= 0)
            this.teleport(entity);
    }

    private teleport(entity: Entity) {
        this._isTeleporting = true;

        const camera = entity.scene.cameras.main;
        const halfFade: number = this._data.fadeDuration / 2;
        entity.scene.tweens.add({
            targets: entity,
            alpha: 0,
            duration: halfFade,
            onComplete: () => {
                // The entity may have been destroyed during the fade
                if (!entity.scene)
                    return;

                entity.setPosition(
                    Phaser.Math.Between(this._data.marginX, camera.width - this._data.marginX),
                    this._originY + Phaser.Math.Between(-this._data.rangeY, this._data.rangeY));

                entity.scene.tweens.add({
                    targets: entity,
                    alpha: 1,
                    duration: halfFade,
                    onComplete: () => {
                        this._isTeleporting = false;
                        this._timeUntilTeleport = this._data.delay;
                    }
                });
            }
        });
    }
}
