import IComponent from "./IComponent.ts";
import Entity from "../entities/Entity.ts";

export default class Health extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = true;

    public static readonly CHANGE_EVENT: string = 'change';
    public static readonly DEATH_EVENT: string = 'death';
    public static readonly MAX_CHANGE_EVENT: string = 'maxChange';
    public static readonly SHIELD_CHANGE_EVENT: string = 'shieldChange';   // PV temporaires
    public static readonly HIT_EVENT: string = 'hit';                      // Touché, même si le bouclier a tout pris

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

    // Le bouclier (PV temporaires) encaisse les dégâts en premier
    public damage(amount: number, emitEvents: boolean = true): void {
        if (!this.enabled || amount <= 0) return;

        if (emitEvents)
            this.emit(Health.HIT_EVENT, amount);

        const absorbed: number = Math.min(this._shield, amount);
        if (absorbed > 0)
            this.setShield(this._shield - absorbed);

        this.adjust(-(amount - absorbed), emitEvents);
    }

    // PV temporaires, au-dessus des PV normaux
    public addShield(amount: number): void {
        if (!this.enabled || amount <= 0) return;
        this.setShield(this._shield + amount);
    }

    public clearShield(): void {
        this.setShield(0);
    }

    private setShield(value: number): void {
        const prev: number = this._shield;
        this._shield = Math.max(0, value);

        if (this._shield !== prev)
            this.emit(Health.SHIELD_CHANGE_EVENT, this._shield, prev);
    }

    public heal(amount: number, emitEvents: boolean = true): void {
        if (!this.enabled || amount <= 0) return;
        this.adjust(amount, emitEvents);
    }

    // Augmente les PV max, sans dépasser le plafond (cap)
    public increaseMax(amount: number, cap: number): void {
        if (!this.enabled || amount <= 0) return;

        const prev: number = this._max;
        this._max = Math.max(prev, Math.min(prev + amount, cap));

        if (this._max !== prev)
            this.emit(Health.MAX_CHANGE_EVENT, this._max, prev);
    }

    private adjust(delta: number, emitEvents: boolean = true): void {
        if (!this.enabled)
            return;

        const prev: number = this._current;
        this._current = Phaser.Math.Clamp(this._current + delta, 0, this._max);

        if (emitEvents && this._current !== prev) {
            this.emit(Health.CHANGE_EVENT, this._current, prev);

            if (this._current <= 0 && prev > 0) {
                const scene = this._entity.scene;
                const explosion = scene.add.image(this._entity.x, this._entity.y, "sprites",
                    "star1");

                scene.tweens.add({
                    targets: explosion,
                    scale: [4, 8, 2, 0],
                    ease: 'Back.easeOut',
                    duration: 800
                });

                scene.tweens.add({
                    targets: explosion,
                    alpha: { from: 1, to: 0 },
                    ease: 'Quad.easeIn',
                    duration: 1000
                }).once('complete', function(_tween: any, _targets: any){
                    explosion.destroy();
                }, this);

                this.emit(Health.DEATH_EVENT);
            }
        }
    }
}