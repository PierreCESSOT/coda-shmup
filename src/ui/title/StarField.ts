import GameConstants from "../../GameConstants.ts";
import TitlePalette, {titleText} from "./TitlePalette.ts";
import type {TitleContext} from "./FrameScale.ts";

type StarData = {
    x: number;
    y: number;
    size: number;       // Font size of the "+"
    duration: number;   // Duration of a full twinkle, in seconds
};

// The "+" stars of the background, which twinkle each at its own pace
export default class StarField {
    private static readonly MIN_ALPHA: number = 0.35;
    private static readonly STARS: StarData[] = [
        {x: 248, y: 281, size: 13, duration: 3.6}, {x: 185, y: 152, size: 11, duration: 2.0},
        {x: 197, y: 500, size: 11, duration: 3.9}, {x: 241, y: 713, size: 13, duration: 2.7},
        {x: 6, y: 683, size: 13, duration: 2.4}, {x: 231, y: 382, size: 9, duration: 3.0},
        {x: 113, y: 66, size: 13, duration: 4.5}, {x: 44, y: 531, size: 13, duration: 4.5},
        {x: 354, y: 420, size: 9, duration: 2.1}, {x: 37, y: 683, size: 13, duration: 2.7},
        {x: 222, y: 460, size: 9, duration: 4.0}, {x: 75, y: 558, size: 11, duration: 4.6},
        {x: 291, y: 173, size: 13, duration: 4.7}, {x: 290, y: 181, size: 13, duration: 4.4},
        {x: 211, y: 628, size: 11, duration: 4.0}, {x: 246, y: 494, size: 13, duration: 3.2},
        {x: 21, y: 662, size: 13, duration: 2.2}, {x: 104, y: 685, size: 11, duration: 3.1},
        {x: 191, y: 712, size: 11, duration: 4.0}, {x: 64, y: 264, size: 9, duration: 3.0},
        {x: 196, y: 529, size: 13, duration: 4.4}, {x: 262, y: 189, size: 9, duration: 3.1},
        {x: 226, y: 39, size: 13, duration: 2.1}, {x: 351, y: 443, size: 9, duration: 3.2},
        {x: 401, y: 627, size: 9, duration: 4.3}, {x: 118, y: 188, size: 9, duration: 4.1}
    ];

    public constructor(context: TitleContext) {
        for (const star of StarField.STARS)
            this.createStar(context, star);
    }

    private createStar({scene, scale}: TitleContext, star: StarData) {
        const text = scene.add.text(scale.px(star.x), scale.px(star.y), '+',
            titleText(GameConstants.FontKeys.SPACE_MONO, scale.px(star.size), TitlePalette.STAR))
            .setAlpha(StarField.MIN_ALPHA);

        // A twinkle goes up then down: each way takes half of the duration
        scene.tweens.add({
            targets: text,
            alpha: 1,
            duration: star.duration * 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
