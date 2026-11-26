import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import GameConstants from "../GameConstants.ts";

/**
 * Ce que tous les ennemis ont en commun (UFO, ennemi sinusoïdal, boss) :
 *  - flash blanc et ralentissement quand ils sont touchés
 *  - réutilisation (pooling) avec enable() / disable()
 *  - un timer de tir optionnel
 *  - désactivation quand ils sortent de l'écran
 *
 * Chaque ennemi n'écrit que ce qui lui est propre : move(), et shoot() s'il utilise le timer.
 */
export default abstract class BaseEnemy extends Entity {
    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent;
    private _isHitFlashing: boolean = false;

    protected abstract move(deltaTime: number): void;

    // Appelé par le timer de tir (voir initShootTimer). Par défaut, l'ennemi ne tire pas
    protected shoot(): void {
    }

    // Appelé après le flash blanc, pour les ennemis qui ont une teinte à eux
    protected restoreAppearance(): void {
        this.clearTint();
    }

    protected initHealth(maxHealth: number) {
        this.addComponent(new Health(maxHealth, this));

        // On écoute une seule fois par ennemi, pas à chaque enable() : les ennemis du pool sont réutilisés
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
        // Certains ennemis (les boss) gèrent leurs attaques eux-mêmes et n'ont pas de timer
        this._shootTimer?.reset(this._shootTimerConfig);

        // Remet la vie au max (ennemi réutilisé du pool), sans déclencher d'événement
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

        // Désactive l'ennemi quand il sort par le bas de l'écran
        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.disable();
        }

        // Ralentit pendant le flash blanc quand il est touché
        this.move(this._isHitFlashing ? deltaTime * 0.5 : deltaTime);
    }

    destroy(fromScene?: boolean) {
        // Le timer appartient à l'horloge de la scène : on le supprime, sinon il appellerait un ennemi détruit
        this._shootTimer?.remove();
        this.scene?.tweens.killTweensOf(this);

        super.destroy(fromScene);
    }
}
