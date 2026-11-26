import IComponent from "./IComponent.ts";
import {getPowerUpEffects, getPowerUpMaxLevel} from "../gameData/PowerUpsData.ts";
import type {PowerUpDefinition, PowerUpEffects} from "../gameData/PowerUpsData.ts";

/**
 * L'emplacement du bonus actif du joueur (bonus ou combo), avec son compte à rebours et son niveau.
 *  - un bonus différent remplace l'ancien, au niveau 1 (le PowerUpSpawner y met un combo quand il y en a un)
 *  - le même bonus, ramassé pendant qu'il est encore actif, monte d'un niveau (jusqu'au niveau max)
 *  - quand le temps est écoulé, le bonus s'arrête : le prochain repartira au niveau 1
 */
export default class PowerUpSlot extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = true;

    public static readonly START_EVENT: string = 'start';   // (effets, durée totale en ms, niveau, bonus) : nouveau bonus ou niveau en plus
    public static readonly END_EVENT: string = 'end';       // (bonus)
    public static readonly TICK_EVENT: string = 'tick';     // (temps restant en ms, durée totale en ms)
    public static readonly EXTEND_EVENT: string = 'extend'; // (temps ajouté en ms, temps restant en ms, durée totale en ms)

    private _current: PowerUpDefinition | undefined;
    private _effects: PowerUpEffects | undefined;
    private _level: number = 0;
    private _timeLeft: number = 0;  // En millisecondes
    private _duration: number = 0;  // Durée totale, en millisecondes (peut grandir avec extend())
    private _baseDuration: number = 0;  // Durée tirée au hasard à l'activation, en millisecondes

    // Bonus ou combo actif, ou undefined sans bonus
    public get current(): PowerUpDefinition | undefined {
        return this._current;
    }

    // Effets actifs (ceux du niveau actuel), ou undefined sans bonus
    public get effects(): PowerUpEffects | undefined {
        return this._effects;
    }

    public get level(): number {
        return this._level;
    }

    public activate(powerUp: PowerUpDefinition) {
        if (!this.enabled)
            return;

        // Durée tirée au hasard, en secondes entières
        const rolledTime: number = Phaser.Math.Between(powerUp.duration.min, powerUp.duration.max) * 1000;

        if (this._current?.id === powerUp.id) {
            // Même bonus : un niveau de plus, et le temps repart
            this._level = Math.min(this._level + 1, getPowerUpMaxLevel(powerUp));
            const extraTime: number = (powerUp.levels?.[this._level - 2]?.extraDuration ?? 0) * 1000;
            this._timeLeft = Math.max(this._timeLeft, rolledTime) + extraTime;
        } else {
            // Autre bonus : l'ancien s'arrête proprement, le nouveau commence au niveau 1
            this.end();
            this._current = powerUp;
            this._level = 1;
            this._timeLeft = rolledTime;
        }

        this._duration = this._timeLeft;
        this._baseDuration = this._timeLeft;
        this._effects = getPowerUpEffects(powerUp, this._level);
        this.emit(PowerUpSlot.START_EVENT, this._effects, this._duration, this._level, powerUp);
    }

    // Ajoute du temps au bonus actif : une part (0.25 = 25 %) de sa durée de départ, sans changer ses effets
    public extend(ratio: number) {
        if (!this._current || ratio <= 0)
            return;

        const extraTime: number = this._baseDuration * ratio;
        this._timeLeft += extraTime;
        this._duration = Math.max(this._duration, this._timeLeft);
        this.emit(PowerUpSlot.EXTEND_EVENT, extraTime, this._timeLeft, this._duration);
    }

    // À appeler à chaque frame
    public update(deltaTime: number) {
        if (!this._current)
            return;

        this._timeLeft -= deltaTime;
        this.emit(PowerUpSlot.TICK_EVENT, Math.max(0, this._timeLeft), this._duration);

        if (this._timeLeft <= 0)
            this.end();
    }

    public end() {
        const powerUp = this._current;
        if (!powerUp)
            return;

        this._current = undefined;
        this._effects = undefined;
        this._level = 0;
        this._timeLeft = 0;
        this.emit(PowerUpSlot.END_EVENT, powerUp);
    }
}
