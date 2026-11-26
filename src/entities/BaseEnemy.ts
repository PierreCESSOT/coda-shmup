import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import GameConstants from "../GameConstants.ts";

// Shared logic of every enemy: hit feedback, pooling, shoot timer and off-screen recycling
export default abstract class BaseEnemy extends Entity {
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
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this._isHitFlashing = true;
            this.setTintFill(0xffffff);

            if (health?.current == 0)
            {
                this.disableBody();
                this.scene.game.events.emit(GameConstants.Events.ENEMY_KILLED_EVENT, this);
            }

            this.scene.time.delayedCall(50, () => {
                this._isHitFlashing = false;
                this.restoreAppearance();

                if (health?.current == 0)
                {
                    this.disable();
                }
            });
        });
    }

    protected initShootTimer(delay: number) {
        this._shootTimerConfig = {
            delay: delay,
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);
    }

    public enable(x: number, y: number) {
        this.enableBody(true, x, y - this.displayHeight, true, true);
        // Some enemies schedule their attacks themselves and have no shoot timer
        this._shootTimer?.reset(this._shootTimerConfig);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        const health = this.getComponent(Health);
        health?.heal(health!.max, false);
    }

    public disable() {
        this.disableBody(true, true);
        if (this._shootTimer)
            this._shootTimer.paused = true;
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime)

        // Destroy entities when out of screen
        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.disable();
        }

        // Slow down while the hit feedback is displayed
        this.move(this._isHitFlashing ? deltaTime * 0.5 : deltaTime);
    }

    destroy(fromScene?: boolean) {
        // The timer belongs to the scene clock: remove it, or it would keep calling a destroyed enemy
        this._shootTimer?.remove();
        this.scene?.tweens.killTweensOf(this);

        super.destroy(fromScene);
    }
}
