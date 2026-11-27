import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import GameConstants from "../GameConstants.ts";

// Shared logic of every enemy: hit feedback, pooling, shoot timer and off-screen recycling
export default abstract class BaseEnemy extends Entity {
    protected static readonly FACING_DOWN_ANGLE: number = 90;

    private static readonly HIT_FLASH_COLOR: number = 0xffffff;
    private static readonly HIT_FLASH_DURATION: number = 50;
    private static readonly HIT_FLASH_SPEED_FACTOR: number = 0.5;

    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent;
    private _isHitFlashing: boolean = false;

    protected abstract shoot(): void;

    protected abstract move(deltaTime: number): void;

    // Called after the hit flash, for enemies that keep a tint of their own
    protected restoreAppearance(): void {
        this.clearTint();
    }

    protected initHealth(maxHealth: number) {
        this.addComponent(new Health(maxHealth, this));

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        this.getComponent(Health)?.on(Health.CHANGE_EVENT, this.onHealthChanged, this);
    }

    protected initShootTimer(delay: number) {
        this._shootTimerConfig = {
            delay,
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);
    }

    public enable(x: number, y: number) {
        this.enableBody(true, x, y - this.displayHeight, true, true);
        this._shootTimer.reset(this._shootTimerConfig);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        this.getComponent(Health)?.restore();
    }

    public disable() {
        this.disableBody(true, true);
        this._shootTimer.paused = true;
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        if (this.isBelowScreen)
            this.disable();

        // Slow down while the hit feedback is displayed
        this.move(this._isHitFlashing ? deltaTime * BaseEnemy.HIT_FLASH_SPEED_FACTOR : deltaTime);
    }

    destroy(fromScene?: boolean) {
        // The timer belongs to the scene clock: remove it, or it would keep calling a destroyed enemy
        this._shootTimer?.remove();
        // Tweens (e.g. the fade of a teleportation) would keep animating a destroyed enemy
        this.scene?.tweens.killTweensOf(this);

        super.destroy(fromScene);
    }

    private get isDead(): boolean {
        return this.getComponent(Health)?.current === 0;
    }

    // Enemies are recycled, not destroyed, once they left the screen by the bottom
    private get isBelowScreen(): boolean {
        return this.y > this.scene.cameras.main.height + this.displayHeight;
    }

    private onHealthChanged() {
        this._isHitFlashing = true;
        this.setTintFill(BaseEnemy.HIT_FLASH_COLOR);

        if (this.isDead) {
            this.disableBody();
            this.scene.game.events.emit(GameConstants.Events.ENEMY_KILLED_EVENT, this);
        }

        this.scene.time.delayedCall(BaseEnemy.HIT_FLASH_DURATION, this.onHitFlashEnded, [], this);
    }

    private onHitFlashEnded() {
        this._isHitFlashing = false;
        this.restoreAppearance();

        if (this.isDead)
            this.disable();
    }
}
