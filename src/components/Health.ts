import IComponent from "./IComponent.ts";
import Entity from "../entities/Entity.ts";
import GameConstants from "../GameConstants.ts";

export default class Health extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = true;

    public static readonly CHANGE_EVENT: string = 'change';                 // (current, previous)
    public static readonly DEATH_EVENT: string = 'death';
    public static readonly MAX_CHANGE_EVENT: string = 'maxChange';          // (max, previous)
    public static readonly SHIELD_CHANGE_EVENT: string = 'shieldChange';    // (shield, previous): temporary health
    public static readonly HIT_EVENT: string = 'hit';                       // (damage): even if the shield absorbed everything

    private static readonly EXPLOSION_FRAME: string = 'star1';
    private static readonly EXPLOSION_SCALES: number[] = [4, 8, 2, 0];
    private static readonly EXPLOSION_SCALE_DURATION: number = 800;
    private static readonly EXPLOSION_FADE_DURATION: number = 1000;

    private _current: number;
    private _max: number;
    private _shield: number = 0;
    private readonly _entity: Entity;

    public get current(): number {
        return this._current;
    }

    public get max(): number {
        return this._max;
    }

    public get shield(): number {
        return this._shield;
    }

    public constructor(value: number, entity: Entity) {
        super();

        this._current = value;
        this._max = value;
        this._entity = entity;
    }

    // The shield (temporary health) absorbs the damage first
    public damage(amount: number): void {
        if (!this.enabled || amount <= 0) return;

        this.emit(Health.HIT_EVENT, amount);

        const absorbed: number = Math.min(this._shield, amount);
        if (absorbed > 0)
            this.setShield(this._shield - absorbed);

        this.adjust(-(amount - absorbed));
    }

    public heal(amount: number): void {
        if (!this.enabled || amount <= 0) return;

        this.adjust(amount);
    }

    // Refills the health without emitting any event, e.g. when a pooled entity is reused
    public restore(): void {
        if (!this.enabled) return;

        this._current = this._max;
    }

    // Temporary health, on top of the normal health
    public addShield(amount: number): void {
        if (!this.enabled || amount <= 0) return;

        this.setShield(this._shield + amount);
    }

    public clearShield(): void {
        this.setShield(0);
    }

    // Raises the max health, without going over the cap
    public increaseMax(amount: number, cap: number): void {
        if (!this.enabled || amount <= 0) return;

        const previous: number = this._max;
        this._max = Math.max(previous, Math.min(previous + amount, cap));

        if (this._max !== previous)
            this.emit(Health.MAX_CHANGE_EVENT, this._max, previous);
    }

    private setShield(value: number): void {
        const previous: number = this._shield;
        this._shield = Math.max(0, value);

        if (this._shield !== previous)
            this.emit(Health.SHIELD_CHANGE_EVENT, this._shield, previous);
    }

    private adjust(delta: number): void {
        const previous: number = this._current;
        this._current = Phaser.Math.Clamp(this._current + delta, 0, this._max);

        if (this._current === previous)
            return;

        this.emit(Health.CHANGE_EVENT, this._current, previous);

        if (this._current <= 0 && previous > 0) {
            this.playDeathExplosion();
            this.emit(Health.DEATH_EVENT);
        }
    }

    private playDeathExplosion(): void {
        const scene = this._entity.scene;
        const explosion = scene.add.image(this._entity.x, this._entity.y, GameConstants.ATLAS_KEY, Health.EXPLOSION_FRAME);

        scene.tweens.add({
            targets: explosion,
            scale: [...Health.EXPLOSION_SCALES],
            ease: 'Back.easeOut',
            duration: Health.EXPLOSION_SCALE_DURATION
        });

        scene.tweens.add({
            targets: explosion,
            alpha: {from: 1, to: 0},
            ease: 'Quad.easeIn',
            duration: Health.EXPLOSION_FADE_DURATION
        }).once('complete', () => explosion.destroy());
    }
}
