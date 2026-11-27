import {GameObjects, Scene} from 'phaser';
import Health from "../components/Health.ts";
import Boss from "../entities/Boss.ts";
import {futureText} from "./TextStyles.ts";

/**
 * Health bar of the boss, at the top of the screen, with its name.
 * When the boss is almost dead, the bar turns pink and the "HOLD F..." message blinks at the bottom.
 */
export default class BossHealthBar {
    private static readonly COLOR: number = 0xff5050;
    private static readonly FINISHER_COLOR: number = 0xff4dff;
    private static readonly FINISHER_TEXT_COLOR: string = '#ff4dff';
    private static readonly FONT_SIZE: number = 48;
    private static readonly NAME_Y: number = 300;
    private static readonly BAR_Y: number = 360;
    private static readonly BAR_HEIGHT: number = 32;
    private static readonly BAR_SIDE_MARGIN: number = 128;
    private static readonly BACKGROUND_ALPHA: number = 0.6;
    private static readonly BORDER_THICKNESS: number = 4;
    private static readonly HINT_DISTANCE_FROM_BOTTOM: number = 360;
    private static readonly HINT_BLINK_ALPHA: number = 0.3;
    private static readonly HINT_BLINK_DURATION: number = 400;

    private readonly _scene: Scene;
    private readonly _nameText: GameObjects.Text;
    private readonly _background: GameObjects.Rectangle;
    private readonly _bar: GameObjects.Rectangle;
    private readonly _finisherHint: GameObjects.Text;

    public constructor(scene: Scene) {
        this._scene = scene;

        const centerX: number = scene.scale.width / 2;
        const width: number = scene.scale.width - BossHealthBar.BAR_SIDE_MARGIN * 2;

        this._nameText = scene.add.text(centerX, BossHealthBar.NAME_Y, "", futureText(BossHealthBar.FONT_SIZE)).setOrigin(0.5);
        this._background = scene.add.rectangle(centerX, BossHealthBar.BAR_Y, width, BossHealthBar.BAR_HEIGHT, 0x000000,
            BossHealthBar.BACKGROUND_ALPHA).setStrokeStyle(BossHealthBar.BORDER_THICKNESS, 0xffffff);
        this._bar = scene.add.rectangle(centerX - width / 2, BossHealthBar.BAR_Y, width, BossHealthBar.BAR_HEIGHT,
            BossHealthBar.COLOR).setOrigin(0, 0.5);
        this._finisherHint = scene.add.text(centerX, scene.scale.height - BossHealthBar.HINT_DISTANCE_FROM_BOTTOM,
            "HOLD F TO CHARGE THE LASER!", futureText(BossHealthBar.FONT_SIZE, BossHealthBar.FINISHER_TEXT_COLOR)).setOrigin(0.5);

        this.hide();
    }

    public show(boss: Boss) {
        this._nameText.setText(boss.bossName);
        this._bar.setScale(1, 1).setFillStyle(BossHealthBar.COLOR);
        this.setVisible(true);

        const health = boss.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, (current: number) => this._bar.setScale(current / health.max, 1));
    }

    public showFinisherHint() {
        this._bar.setFillStyle(BossHealthBar.FINISHER_COLOR);
        this._finisherHint.setVisible(true).setAlpha(1);

        // Blinks until the boss dies
        this._scene.tweens.add({
            targets: this._finisherHint,
            alpha: BossHealthBar.HINT_BLINK_ALPHA,
            yoyo: true,
            repeat: -1,
            duration: BossHealthBar.HINT_BLINK_DURATION
        });
    }

    public hide() {
        this.setVisible(false);
        this._scene.tweens.killTweensOf(this._finisherHint);
        this._finisherHint.setVisible(false);
    }

    private setVisible(visible: boolean) {
        this._nameText.setVisible(visible);
        this._background.setVisible(visible);
        this._bar.setVisible(visible);
    }
}
