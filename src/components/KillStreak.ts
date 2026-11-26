import IComponent from "./IComponent.ts";

// Counts kills in a row. The streak is active once enough kills are reached, until reset() is called
export default class KillStreak extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = true;

    public static readonly CHANGE_EVENT: string = 'change';
    public static readonly START_EVENT: string = 'start';
    public static readonly END_EVENT: string = 'end';

    private readonly _killsRequired: number;
    private _count: number = 0;

    public get count(): number {
        return this._count;
    }

    public get killsRequired(): number {
        return this._killsRequired;
    }

    public get isActive(): boolean {
        return this._count >= this._killsRequired;
    }

    public constructor(killsRequired: number) {
        super();

        this._killsRequired = Math.max(1, killsRequired);
    }

    public addKill() {
        if (!this.enabled)
            return;

        this._count++;
        this.emit(KillStreak.CHANGE_EVENT, this._count);

        if (this._count === this._killsRequired)
            this.emit(KillStreak.START_EVENT);
    }

    public reset() {
        if (this._count === 0)
            return;

        const wasActive: boolean = this.isActive;
        this._count = 0;
        this.emit(KillStreak.CHANGE_EVENT, this._count);

        if (wasActive)
            this.emit(KillStreak.END_EVENT);
    }
}
