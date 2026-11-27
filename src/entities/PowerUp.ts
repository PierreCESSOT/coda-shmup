import Entity from './Entity.ts';
import GameConstants from "../GameConstants.ts";
import type {PowerUpData} from "../gameData/PowerUpsData.ts";

/**
 * A power-up that falls on the screen, like in Mario: the player has to pass over it to catch it.
 * If it leaves by the bottom of the screen, it is lost.
 */
export default class PowerUp extends Entity {
    // Gentle rocking and pulsing to catch the eye
    private static readonly ROCKING_TIME_SCALE: number = 200;
    private static readonly ROCKING_ANGLE: number = 15;
    private static readonly PULSE_TIME_SCALE: number = 150;
    private static readonly PULSE_AMPLITUDE: number = 0.1;

    private _data: PowerUpData;
    private _fallSpeed: number = 0;
    private _elapsedTime: number = 0;

    public get powerUpData(): PowerUpData {
        return this._data;
    }

    // Called once, when the power-up is created in the pool: every power-up falls at the same speed
    public init(fallSpeed: number) {
        this._fallSpeed = fallSpeed;
    }

    // Power-ups are reused (pooling): enable() resets everything
    public enable(x: number, y: number, data: PowerUpData) {
        this._data = data;
        this._elapsedTime = 0;

        this.setTexture(GameConstants.ATLAS_KEY, data.texture);
        this.enableBody(true, x, y, true, true);
        this.arcadeBody.setCircle(this.width / 2);
    }

    public disable() {
        this.disableBody(true, true);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        this._elapsedTime += deltaTime;
        this.y += this._fallSpeed * deltaTime;

        this.angle = Math.sin(this._elapsedTime / PowerUp.ROCKING_TIME_SCALE) * PowerUp.ROCKING_ANGLE;
        this.setScale(1 + Math.sin(this._elapsedTime / PowerUp.PULSE_TIME_SCALE) * PowerUp.PULSE_AMPLITUDE);

        if (this.y > this.scene.cameras.main.height + this.displayHeight)
            this.disable();
    }
}
