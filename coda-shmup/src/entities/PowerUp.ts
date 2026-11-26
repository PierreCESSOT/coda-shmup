import Entity from './Entity.ts';
import type {PowerUpData} from "../gameData/PowerUpsData.ts";

/**
 * Un bonus qui tombe à l'écran, comme dans Mario : le joueur doit passer dessus pour l'attraper.
 * S'il sort par le bas de l'écran, il est perdu.
 */
export default class PowerUp extends Entity {
    private _data: PowerUpData;
    private _fallSpeed: number = 0;
    private _elapsedTime: number = 0;

    public get powerUpData(): PowerUpData {
        return this._data;
    }

    // Les bonus sont réutilisés (pooling) : enable() remet tout à zéro
    public enable(x: number, y: number, data: PowerUpData, fallSpeed: number) {
        this._data = data;
        this._fallSpeed = fallSpeed;
        this._elapsedTime = 0;

        this.setTexture('sprites', data.texture);
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

        // Petit balancement et pulsation pour attirer l'oeil
        this.angle = Math.sin(this._elapsedTime / 200) * 15;
        this.setScale(1 + Math.sin(this._elapsedTime / 150) * 0.1);

        if (this.y > this.scene.cameras.main.height + this.displayHeight)
            this.disable();
    }
}
