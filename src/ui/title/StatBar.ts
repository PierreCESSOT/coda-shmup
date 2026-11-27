import {GameObjects, Scene} from "phaser";
import GameConstants from "../../GameConstants.ts";
import TitlePalette, {titleText} from "./TitlePalette.ts";
import type {TitleContext} from "./FrameScale.ts";

export type StatBarSetup = {
    label: string;
    left: number;           // Left of the whole line, in frame units
    centerY: number;
    width: number;          // Width of the whole line: the label, then the bar
};

// A stat of the ship: "SPEED [#######   0.9   ]". The bar is white with a green fill that grows to the value
export default class StatBar {
    private static readonly LABEL_WIDTH: number = 74;
    private static readonly LABEL_GAP: number = 10;
    private static readonly LABEL_FONT_SIZE: number = 12;
    private static readonly BAR_HEIGHT: number = 18;
    private static readonly BAR_FRAME: number = 2;
    private static readonly VALUE_FONT_SIZE: number = 10;
    private static readonly FILL_DURATION: number = 400;

    private readonly _scene: Scene;
    private readonly _fill: GameObjects.Rectangle;
    private readonly _value: GameObjects.Text;

    public constructor({scene, scale}: TitleContext, setup: StatBarSetup) {
        this._scene = scene;

        const y: number = scale.px(setup.centerY);
        const barLeft: number = setup.left + StatBar.LABEL_WIDTH + StatBar.LABEL_GAP;
        const barWidth: number = setup.width - StatBar.LABEL_WIDTH - StatBar.LABEL_GAP;

        scene.add.text(scale.px(setup.left + StatBar.LABEL_WIDTH), y, setup.label,
            titleText(GameConstants.FontKeys.AUDIOWIDE, scale.px(StatBar.LABEL_FONT_SIZE))).setOrigin(1, 0.5);

        scene.add.rectangle(scale.px(barLeft), y, scale.px(barWidth), scale.px(StatBar.BAR_HEIGHT), TitlePalette.WHITE)
            .setOrigin(0, 0.5);
        this._fill = scene.add.rectangle(scale.px(barLeft + StatBar.BAR_FRAME), y,
            scale.px(barWidth - StatBar.BAR_FRAME * 2), scale.px(StatBar.BAR_HEIGHT - StatBar.BAR_FRAME * 2), TitlePalette.BAR_FILL)
            .setOrigin(0, 0.5).setScale(0, 1);
        this._value = scene.add.text(scale.px(barLeft + barWidth / 2), y, '',
            titleText(GameConstants.FontKeys.SILKSCREEN, scale.px(StatBar.VALUE_FONT_SIZE), TitlePalette.BAR_LABEL)).setOrigin(0.5);
    }

    // "ratio" goes from 0 to 1: the fill grows (or shrinks) to it
    public setValue(valueText: string, ratio: number) {
        this._value.setText(valueText);

        this._scene.tweens.killTweensOf(this._fill);
        this._scene.tweens.add({targets: this._fill, scaleX: ratio, duration: StatBar.FILL_DURATION, ease: 'Quad.easeOut'});
    }
}
