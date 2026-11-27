import Entity from "../entities/Entity.ts";
import IPatternMovement from "./IPatternMovement.ts";
import {TeleportMovementData} from "../gameData/MovementData.ts";

// Disappears, reappears somewhere else, then waits before the next teleportation
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

        this.fadeTo(entity, 0, () => {
            // The entity may have been destroyed during the fade
            if (!entity.scene)
                return;

            this.relocate(entity);
            this.fadeTo(entity, 1, () => this.endTeleport());
        });
    }

    // Half of the fade duration is spent disappearing, the other half reappearing
    private fadeTo(entity: Entity, alpha: number, onComplete: () => void) {
        entity.scene.tweens.add({targets: entity, alpha, duration: this._data.fadeDuration / 2, onComplete});
    }

    private relocate(entity: Entity) {
        const cameraWidth: number = entity.scene.cameras.main.width;
        entity.setPosition(
            Phaser.Math.Between(this._data.marginX, cameraWidth - this._data.marginX),
            this._originY + Phaser.Math.Between(-this._data.rangeY, this._data.rangeY));
    }

    private endTeleport() {
        this._isTeleporting = false;
        this._timeUntilTeleport = this._data.delay;
    }
}
