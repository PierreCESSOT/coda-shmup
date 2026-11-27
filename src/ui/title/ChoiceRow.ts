import {GameObjects} from "phaser";
import {titleText} from "./TitlePalette.ts";
import ArrowButton from "./ArrowButton.ts";
import type {TitleContext} from "./FrameScale.ts";

export type ChoiceRowSetup = {
    centerX: number;            // In frame units
    centerY: number;
    labelWidth: number;         // Width of the zone of the text between the two arrows
    fontFamily: string;
    fontSize: number;
    color: string;
    onPrevious: () => void;
    onNext: () => void;
};

// A line with the current choice written between two arrows: "<  STRIKER  >"
export default class ChoiceRow {
    private static readonly ARROW_GAP: number = 6;

    private readonly _label: GameObjects.Text;

    public constructor(context: TitleContext, setup: ChoiceRowSetup) {
        // Distance between the center of the row and the center of each arrow
        const arrowOffset: number = (setup.labelWidth + ArrowButton.WIDTH) / 2 + ChoiceRow.ARROW_GAP;

        new ArrowButton(context, {x: setup.centerX - arrowOffset, y: setup.centerY, symbol: '<', onClick: setup.onPrevious});
        new ArrowButton(context, {x: setup.centerX + arrowOffset, y: setup.centerY, symbol: '>', onClick: setup.onNext});

        const {scene, scale} = context;
        this._label = scene.add.text(scale.px(setup.centerX), scale.px(setup.centerY), '',
            titleText(setup.fontFamily, scale.px(setup.fontSize), setup.color)).setOrigin(0.5);
    }

    public setText(text: string) {
        this._label.setText(text);
    }
}
