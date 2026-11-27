import {GameObjects} from "phaser";
import GameConstants from "../../GameConstants.ts";
import ShipAppearance from "../../utils/ShipAppearance.ts";
import type {PlayerShipData} from "../../gameData/PlayerShipsData.ts";
import type {ShipColorData} from "../../gameData/ShipColorData.ts";
import TitlePalette from "./TitlePalette.ts";
import type {TitleContext} from "./FrameScale.ts";

export type FloatingShipSetup = {
    x: number;              // Center of the box that holds the ship, in frame units
    y: number;
    boxSize: number;        // The ship is scaled to fit this square box
};

// A ship that floats gently, drawn with the real sprites and the real colors of the game
export default class FloatingShip {
    private static readonly FACING_UP_ANGLE: number = -90;
    private static readonly FLOAT_DISTANCE: number = 5;
    private static readonly FLOAT_DURATION: number = 1300;
    private static readonly GLOW_PADDING: number = 12;
    private static readonly GLOW_STRENGTH: number = 4;

    private readonly _sprite: GameObjects.Sprite;
    private readonly _boxSize: number;

    public constructor({scene, scale}: TitleContext, setup: FloatingShipSetup) {
        this._boxSize = scale.px(setup.boxSize);
        this._sprite = scene.add.sprite(scale.px(setup.x), scale.px(setup.y), GameConstants.ATLAS_KEY)
            .setAngle(FloatingShip.FACING_UP_ANGLE);

        // The glow only exists with the WebGL renderer, hence the "?."
        this._sprite.preFX?.setPadding(scale.px(FloatingShip.GLOW_PADDING));
        this._sprite.preFX?.addGlow(TitlePalette.WHITE, FloatingShip.GLOW_STRENGTH);

        scene.tweens.add({
            targets: this._sprite,
            y: this._sprite.y - scale.px(FloatingShip.FLOAT_DISTANCE),
            duration: FloatingShip.FLOAT_DURATION,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public show(ship: PlayerShipData, color: ShipColorData) {
        ShipAppearance.apply(this._sprite, ship, color);
        this._sprite.setScale(this._boxSize / Math.max(this._sprite.width, this._sprite.height));
    }
}
