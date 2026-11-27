import {GameObjects, Scene} from 'phaser';
import PowerUpSlot from "../components/PowerUpSlot.ts";
import type {PowerUpDefinition, PowerUpEffects} from "../gameData/PowerUpsData.ts";
import {outlinedFutureText} from "./TextStyles.ts";

/**
 * Display of the active power-up:
 *  - at the top right: its name, the remaining time ("SPEED x2 II  12s"), a bar that empties,
 *    and its level (LEVEL 1 to 3), or COMBO for a combo
 *  - in the middle of the screen: its name in big, only when it is caught or goes up one level
 */
export default class PowerUpDisplay {
    private static readonly MARGIN: number = 64;
    private static readonly TIMER_WIDTH: number = 320;
    private static readonly TIMER_HEIGHT: number = 14;
    private static readonly LABEL_Y: number = 200;
    private static readonly TIMER_Y: number = 262;
    private static readonly LEVEL_Y: number = 282;
    private static readonly LABEL_FONT_SIZE: number = 44;
    private static readonly LEVEL_FONT_SIZE: number = 36;
    private static readonly BANNER_FONT_SIZE: number = 96;
    private static readonly BANNER_START_SCALE: number = 2;
    private static readonly EXTRA_TIME_OFFSET_Y: number = 50;
    private static readonly POPUP_DRIFT: number = 60;
    private static readonly EXTRA_TIME_DURATION: number = 1200;

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

        const right: number = scene.scale.width - PowerUpDisplay.MARGIN;
        this._label = scene.add.text(right, PowerUpDisplay.LABEL_Y, "", outlinedFutureText(PowerUpDisplay.LABEL_FONT_SIZE))
            .setOrigin(1, 0);
        this._timerBackground = scene.add.rectangle(right, PowerUpDisplay.TIMER_Y, PowerUpDisplay.TIMER_WIDTH,
            PowerUpDisplay.TIMER_HEIGHT, 0x000000, 0.6).setOrigin(1, 0.5).setStrokeStyle(2, 0xffffff);
        this._timerBar = scene.add.rectangle(right - PowerUpDisplay.TIMER_WIDTH, PowerUpDisplay.TIMER_Y,
            PowerUpDisplay.TIMER_WIDTH, PowerUpDisplay.TIMER_HEIGHT, 0xffffff).setOrigin(0, 0.5);
        this._levelText = scene.add.text(right, PowerUpDisplay.LEVEL_Y, "", outlinedFutureText(PowerUpDisplay.LEVEL_FONT_SIZE))
            .setOrigin(1, 0);
        this._banner = scene.add.text(scene.scale.width / 2, scene.scale.height / 3, "",
            outlinedFutureText(PowerUpDisplay.BANNER_FONT_SIZE)).setOrigin(0.5);

        this.hide();
        this._banner.setVisible(false);
    }

    // Follows the power-up of the player
    public bind(slot: PowerUpSlot) {
        slot.on(PowerUpSlot.START_EVENT, (effects: PowerUpEffects, level: number, duration: number, powerUp: PowerUpDefinition) =>
            this.show(effects, duration, this.getLevelLabel(powerUp, level)));
        slot.on(PowerUpSlot.TICK_EVENT, (timeLeft: number, duration: number) => this.refresh(timeLeft, duration));
        slot.on(PowerUpSlot.EXTEND_EVENT, (extraTime: number) => this.showExtraTime(extraTime));
        slot.on(PowerUpSlot.END_EVENT, () => this.hide());
    }

    private getLevelLabel(powerUp: PowerUpDefinition, level: number): string {
        return 'parts' in powerUp ? "COMBO" : "LEVEL " + level;
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

        // The text only changes once per second
        const seconds: number = Math.ceil(timeLeft / 1000);
        if (seconds !== this._secondsShown) {
            this._secondsShown = seconds;
            this._label.setText(this._name + "  " + seconds + "s");
        }
    }

    // Small "+4s" that goes up under the timer
    private showExtraTime(extraTime: number) {
        const popup = this._scene.add.text(this._label.x, this._levelText.y + PowerUpDisplay.EXTRA_TIME_OFFSET_Y,
            "+" + Math.round(extraTime / 1000) + "s",
            outlinedFutureText(PowerUpDisplay.LABEL_FONT_SIZE, this._label.style.color as string)).setOrigin(1, 0);

        this._scene.tweens.add({
            targets: popup,
            y: popup.y - PowerUpDisplay.POPUP_DRIFT,
            alpha: {from: 1, to: 0},
            ease: 'Quad.easeOut',
            duration: PowerUpDisplay.EXTRA_TIME_DURATION,
            onComplete: () => popup.destroy()
        });
    }

    private hide() {
        this._label.setVisible(false);
        this._levelText.setVisible(false);
        this._timerBackground.setVisible(false);
        this._timerBar.setVisible(false);
    }

    // Appears in big in the middle of the screen, then disappears
    private showBanner(effects: PowerUpEffects) {
        this._scene.tweens.killTweensOf(this._banner);
        this._banner.setText(effects.name + "!").setColor(effects.color)
            .setVisible(true).setAlpha(1).setScale(PowerUpDisplay.BANNER_START_SCALE);

        this._scene.tweens.chain({
            targets: this._banner,
            tweens: [
                {scale: 1, ease: 'Back.easeOut', duration: 400},
                {alpha: 0, ease: 'Quad.easeIn', duration: 500, delay: 700}
            ]
        });
    }
}
