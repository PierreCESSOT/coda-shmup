import IComponent from "./IComponent.ts";
import {getPowerUpEffects, getPowerUpLevelData, getPowerUpMaxLevel} from "../gameData/PowerUpsData.ts";
import type {PowerUpDefinition, PowerUpEffects} from "../gameData/PowerUpsData.ts";

/**
 * The slot of the active power-up of the player (power-up or combo), with its countdown and its level.
 *  - a different power-up replaces the old one, at level 1 (the PowerUpSpawner gives a combo when there is one)
 *  - the same power-up, caught while it is still active, goes up one level (up to the max level)
 *  - when the time is over, the power-up stops: the next one starts again at level 1
 */
export default class PowerUpSlot extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = true;

    public static readonly START_EVENT: string = 'start';   // (effects, level, total duration in ms, power-up): new power-up or one more level
    public static readonly END_EVENT: string = 'end';       // (power-up)
    public static readonly TICK_EVENT: string = 'tick';     // (time left in ms, total duration in ms)
    public static readonly EXTEND_EVENT: string = 'extend'; // (added time in ms, time left in ms, total duration in ms)

    private _current: PowerUpDefinition | undefined;
    private _effects: PowerUpEffects | undefined;
    private _level: number = 0;
    private _timeLeft: number = 0;      // In milliseconds
    private _duration: number = 0;      // Total duration in milliseconds (can grow with extend())
    private _baseDuration: number = 0;  // Duration drawn at random when activated, in milliseconds

    // Active power-up or combo, or undefined without power-up
    public get current(): PowerUpDefinition | undefined {
        return this._current;
    }

    // Active effects (the ones of the current level), or undefined without power-up
    public get effects(): PowerUpEffects | undefined {
        return this._effects;
    }

    public activate(powerUp: PowerUpDefinition) {
        if (!this.enabled)
            return;

        if (this._current?.id === powerUp.id)
            this.levelUp(powerUp);
        else
            this.replaceWith(powerUp);

        this._duration = this._timeLeft;
        this._baseDuration = this._timeLeft;
        this._effects = getPowerUpEffects(powerUp, this._level);
        this.emit(PowerUpSlot.START_EVENT, this._effects, this._level, this._duration, powerUp);
    }

    // Adds time to the active power-up: a share (0.25 = 25 %) of its starting duration, without changing its effects
    public extend(ratio: number) {
        if (!this._current || ratio <= 0)
            return;

        const extraTime: number = this._baseDuration * ratio;
        this._timeLeft += extraTime;
        this._duration = Math.max(this._duration, this._timeLeft);
        this.emit(PowerUpSlot.EXTEND_EVENT, extraTime, this._timeLeft, this._duration);
    }

    // To call every frame
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

    // Same power-up: one more level, and the time starts again
    private levelUp(powerUp: PowerUpDefinition) {
        const rolledTime: number = this.rollDuration(powerUp);

        this._level = Math.min(this._level + 1, getPowerUpMaxLevel(powerUp));
        const extraTime: number = (getPowerUpLevelData(powerUp, this._level)?.extraDuration ?? 0) * 1000;
        this._timeLeft = Math.max(this._timeLeft, rolledTime) + extraTime;
    }

    // Other power-up: the old one stops cleanly, the new one starts at level 1
    private replaceWith(powerUp: PowerUpDefinition) {
        const rolledTime: number = this.rollDuration(powerUp);

        this.end();
        this._current = powerUp;
        this._level = 1;
        this._timeLeft = rolledTime;
    }

    // Duration drawn at random, in whole seconds, converted to milliseconds
    private rollDuration(powerUp: PowerUpDefinition): number {
        return Phaser.Math.Between(powerUp.duration.min, powerUp.duration.max) * 1000;
    }
}
