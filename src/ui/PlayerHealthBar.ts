import {GameObjects, Scene} from 'phaser';
import Health from "../components/Health.ts";
import GameConstants from "../GameConstants.ts";
import {outlinedFutureText} from "./TextStyles.ts";

/**
 * Health bar of the player, at the top left: "73 / 100".
 * Green, then yellow under 50 %, then red under 25 %.
 * Also shows a small text when the player gains health or max health.
 */
export default class PlayerHealthBar {
    private static readonly WIDTH: number = 420;
    private static readonly HEIGHT: number = 40;
    private static readonly MARGIN: number = 64;
    private static readonly ICON_SCALE: number = 1.5;
    private static readonly ICON_BAR_GAP: number = 24;
    private static readonly BACKGROUND_ALPHA: number = 0.6;
    private static readonly BORDER_THICKNESS: number = 4;
    private static readonly HEALTHY_COLOR: number = 0x5cff7a;
    private static readonly WARNING_COLOR: number = 0xffd93c;
    private static readonly DANGER_COLOR: number = 0xff5050;
    private static readonly WARNING_RATIO: number = 0.5;
    private static readonly DANGER_RATIO: number = 0.25;
    private static readonly TEXT_FONT_SIZE: number = 32;
    private static readonly POPUP_FONT_SIZE: number = 44;
    private static readonly POPUP_OFFSET_Y: number = 48;
    private static readonly MAX_POPUP_EXTRA_OFFSET_Y: number = 56;
    private static readonly POPUP_DRIFT: number = 60;
    private static readonly POPUP_DURATION: number = 1500;
    private static readonly MIN_HEAL_FOR_POPUP: number = 1;

    private readonly _scene: Scene;
    private readonly _bar: GameObjects.Rectangle;
    private readonly _text: GameObjects.Text;

    public constructor(scene: Scene) {
        this._scene = scene;

        const icon = scene.add.image(PlayerHealthBar.MARGIN, PlayerHealthBar.MARGIN, GameConstants.ATLAS_KEY, "playerLife1_blue")
            .setOrigin(0, 0).setScale(PlayerHealthBar.ICON_SCALE);
        const x: number = icon.x + icon.displayWidth + PlayerHealthBar.ICON_BAR_GAP;
        const y: number = icon.y + icon.displayHeight / 2;

        // Black background, colored bar on top of it, text in the middle
        scene.add.rectangle(x, y, PlayerHealthBar.WIDTH, PlayerHealthBar.HEIGHT, 0x000000, PlayerHealthBar.BACKGROUND_ALPHA)
            .setOrigin(0, 0.5).setStrokeStyle(PlayerHealthBar.BORDER_THICKNESS, 0xffffff);
        this._bar = scene.add.rectangle(x, y, PlayerHealthBar.WIDTH, PlayerHealthBar.HEIGHT, PlayerHealthBar.HEALTHY_COLOR)
            .setOrigin(0, 0.5);
        this._text = scene.add.text(x + PlayerHealthBar.WIDTH / 2, y, "", outlinedFutureText(PlayerHealthBar.TEXT_FONT_SIZE))
            .setOrigin(0.5);
    }

    // Follows the health of the player
    public bind(health: Health) {
        this.refresh(health);

        health.on(Health.CHANGE_EVENT, (current: number, previous: number) => {
            this.refresh(health);
            // No text for very small heals (e.g. the 0.25 given by each killed enemy)
            if (current - previous >= PlayerHealthBar.MIN_HEAL_FOR_POPUP)
                this.showPopup("+" + Math.round(current - previous) + " HP", '#5cff7a', 0);
        });

        health.on(Health.MAX_CHANGE_EVENT, (max: number, previous: number) => {
            this.refresh(health);
            this.showPopup("MAX HP +" + Math.round(max - previous), '#ffd93c', PlayerHealthBar.MAX_POPUP_EXTRA_OFFSET_Y);
        });
    }

    private refresh(health: Health) {
        const ratio: number = health.current / health.max;
        this._bar.setScale(ratio, 1);
        this._bar.setFillStyle(this.getBarColor(ratio));

        this._text.setText(this.formatText(health));
    }

    private getBarColor(ratio: number): number {
        if (ratio > PlayerHealthBar.WARNING_RATIO)
            return PlayerHealthBar.HEALTHY_COLOR;

        if (ratio > PlayerHealthBar.DANGER_RATIO)
            return PlayerHealthBar.WARNING_COLOR;

        return PlayerHealthBar.DANGER_COLOR;
    }

    private formatText(health: Health): string {
        const text: string = Math.ceil(health.current) + " / " + health.max;

        return text;
    }

    // Text that goes down under the bar while fading out
    private showPopup(text: string, color: string, extraOffsetY: number) {
        const popup = this._scene.add.text(this._text.x, this._text.y + PlayerHealthBar.POPUP_OFFSET_Y + extraOffsetY, text,
            outlinedFutureText(PlayerHealthBar.POPUP_FONT_SIZE, color)).setOrigin(0.5);

        this._scene.tweens.add({
            targets: popup,
            y: popup.y + PlayerHealthBar.POPUP_DRIFT,
            alpha: {from: 1, to: 0},
            ease: 'Quad.easeOut',
            duration: PlayerHealthBar.POPUP_DURATION,
            onComplete: () => popup.destroy()
        });
    }
}
