import {Display, GameObjects} from 'phaser';
import {PlayerShipData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import GameConstants from "../GameConstants.ts";

export default class ShipAppearance {
    // Applies the ship design and color to any sprite (the player, or a preview in a menu)
    static apply(sprite: GameObjects.Sprite, shipData: PlayerShipData, colorData: ShipColorData) {
        if (colorData.color === null) {
            sprite.setTexture(GameConstants.ATLAS_KEY, shipData.texture);
            sprite.clearTint();
            return;
        }

        // Tinting multiplies the colors: a greyscale texture gives the exact chosen color
        sprite.setTexture(GameConstants.ATLAS_KEY, shipData.tintableTexture);
        sprite.setTint(Display.Color.HexStringToColor(colorData.color).color);
    }
}
