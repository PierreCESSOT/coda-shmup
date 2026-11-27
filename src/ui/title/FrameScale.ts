import {Scene} from "phaser";

// The title screen was designed in a frame that is 420 px wide. Every position and size written in the
// classes of the title screen is in that frame: px() converts it to the real resolution of the game.
export default class FrameScale {
    public static readonly FRAME_WIDTH: number = 420;

    private readonly _factor: number;

    public constructor(gameWidth: number) {
        this._factor = gameWidth / FrameScale.FRAME_WIDTH;
    }

    public px(frameValue: number): number {
        return frameValue * this._factor;
    }
}

// What every piece of the title screen needs: the scene to draw in, and the conversion of the frame values
export type TitleContext = {
    scene: Scene;
    scale: FrameScale;
};
