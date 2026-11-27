import GameConstants from "../../GameConstants.ts";
import TitlePalette, {titleText} from "./TitlePalette.ts";
import type {TitleContext} from "./FrameScale.ts";

export type ArrowSetup = {
    x: number;              // Center of the button, in frame units
    y: number;
    symbol: string;         // "<" or ">"
    onClick: () => void;
};

// A "<" or ">" that can also be clicked: it turns yellow when hovered
export default class ArrowButton {
    public static readonly WIDTH: number = 44;

    private static readonly HEIGHT: number = 40;
    private static readonly FONT_SIZE: number = 18;

    public constructor({scene, scale}: TitleContext, setup: ArrowSetup) {
        const x: number = scale.px(setup.x);
        const y: number = scale.px(setup.y);

        const label = scene.add.text(x, y, setup.symbol,
            titleText(GameConstants.FontKeys.SPACE_MONO, scale.px(ArrowButton.FONT_SIZE))).setOrigin(0.5);

        const hitArea = scene.add.zone(x, y, scale.px(ArrowButton.WIDTH), scale.px(ArrowButton.HEIGHT))
            .setInteractive({useHandCursor: true});
        hitArea.on('pointerover', () => label.setColor(TitlePalette.HIGHLIGHT));
        hitArea.on('pointerout', () => label.setColor(TitlePalette.TEXT));
        hitArea.on('pointerdown', setup.onClick);
    }
}
