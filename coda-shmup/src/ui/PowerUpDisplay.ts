import {GameObjects, Scene} from 'phaser';
import PowerUpSlot from "../components/PowerUpSlot.ts";
import type {PowerUpDefinition, PowerUpEffects} from "../gameData/PowerUpsData.ts";
import {futureText} from "./TextStyles.ts";

/**
 * Affichage du bonus actif :
 *  - en haut à droite : son nom, le temps restant ("SPEED x2 II  12s"), une barre qui se vide,
 *    et son niveau (LEVEL 1 à 3), ou COMBO pour un combo
 *  - au milieu de l'écran : son nom en grand, juste quand on le ramasse ou qu'il monte de niveau
 */
export default class PowerUpDisplay {
    private static readonly TIMER_WIDTH: number = 320;

    private readonly _scene: Scene;
    private readonly _label: GameObjects.Text;
    private readonly _timerBackground: GameObjects.Rectangle;
    private readonly _timerBar: GameObjects.Rectangle;
    private readonly _banner: GameObjects.Text;
    private readonly _levelText: GameObjects.Text;
    private _secondsShown: number = -1;
    private _name: string = "";

    public constructor(scene: Scene) {
        this._scene = scene;

        const right: number = scene.scale.width - 64;
        this._label = scene.add.text(right, 200, "", futureText(44, '#ffffff', true)).setOrigin(1, 0);
        this._timerBackground = scene.add.rectangle(right, 262, PowerUpDisplay.TIMER_WIDTH, 14, 0x000000, 0.6)
            .setOrigin(1, 0.5).setStrokeStyle(2, 0xffffff);
        this._timerBar = scene.add.rectangle(right - PowerUpDisplay.TIMER_WIDTH, 262, PowerUpDisplay.TIMER_WIDTH, 14, 0xffffff)
            .setOrigin(0, 0.5);
        this._levelText = scene.add.text(right, 282, "", futureText(36, '#ffffff', true)).setOrigin(1, 0);
        this._banner = scene.add.text(scene.scale.width / 2, scene.scale.height / 3, "", futureText(96, '#ffffff', true))
            .setOrigin(0.5);

        this.hide();
        this._banner.setVisible(false);
    }

    // Suit le bonus du joueur
    public bind(slot: PowerUpSlot) {
        slot.on(PowerUpSlot.START_EVENT, (effects: PowerUpEffects, duration: number, level: number, powerUp: PowerUpDefinition) =>
            this.show(effects, duration, 'parts' in powerUp ? "COMBO" : "LEVEL " + level));
        slot.on(PowerUpSlot.TICK_EVENT, (timeLeft: number, duration: number) => this.refresh(timeLeft, duration));
        slot.on(PowerUpSlot.EXTEND_EVENT, (extraTime: number) => this.showExtraTime(extraTime));
        slot.on(PowerUpSlot.END_EVENT, () => this.hide());
    }

    private show(effects: PowerUpEffects, duration: number, levelLabel: string) {
        this._name = effects.name;
        this._label.setColor(effects.color).setVisible(true);
        this._levelText.setText(levelLabel).setColor(effects.color).setVisible(true);
        this._timerBar.setFillStyle(Phaser.Display.Color.HexStringToColor(effects.color).color).setVisible(true);
        this._timerBackground.setVisible(true);
        this._secondsShown = -1;
        this.refresh(duration, duration);
        this.showBanner(effects);
    }

    private refresh(timeLeft: number, duration: number) {
        this._timerBar.setScale(timeLeft / duration, 1);

        // Le texte ne change qu'une fois par seconde
        const seconds: number = Math.ceil(timeLeft / 1000);
        if (seconds !== this._secondsShown) {
            this._secondsShown = seconds;
            this._label.setText(this._name + "  " + seconds + "s");
        }
    }

    // Petit "+4s" qui monte sous le timer
    private showExtraTime(extraTime: number) {
        const popup = this._scene.add.text(this._label.x, this._levelText.y + 50, "+" + Math.round(extraTime / 1000) + "s",
            futureText(44, this._label.style.color as string, true)).setOrigin(1, 0);

        this._scene.tweens.add({
            targets: popup,
            y: popup.y - 60,
            alpha: {from: 1, to: 0},
            ease: 'Quad.easeOut',
            duration: 1200,
            onComplete: () => popup.destroy()
        });
    }

    private hide() {
        this._label.setVisible(false);
        this._levelText.setVisible(false);
        this._timerBackground.setVisible(false);
        this._timerBar.setVisible(false);
    }

    // Apparaît en grand au milieu de l'écran, puis disparaît
    private showBanner(effects: PowerUpEffects) {
        this._scene.tweens.killTweensOf(this._banner);
        this._banner.setText(effects.name + "!").setColor(effects.color)
            .setVisible(true).setAlpha(1).setScale(2);

        this._scene.tweens.chain({
            targets: this._banner,
            tweens: [
                {scale: 1, ease: 'Back.easeOut', duration: 400},
                {alpha: 0, ease: 'Quad.easeIn', duration: 500, delay: 700}
            ]
        });
    }
}
