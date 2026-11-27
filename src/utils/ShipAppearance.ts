import {Display, GameObjects, Scene} from 'phaser';
import {PlayerShipData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import GameConstants from "../GameConstants.ts";

export default class ShipAppearance {
    /**
     * Applies the design and the color to any sprite (the player, or the preview of a menu).
     *
     * The color only touches the secondary parts: a new texture is created by drawing the original ship,
     * then its colored secondary parts on top of it. This texture is kept in memory and reused afterwards.
     */
    static apply(sprite: GameObjects.Sprite, shipData: PlayerShipData, colorData: ShipColorData) {
        sprite.clearTint();

        if (colorData.color === null) {
            sprite.setTexture(GameConstants.ATLAS_KEY, shipData.texture);
            return;
        }

        sprite.setTexture(ShipAppearance.getColoredTextureKey(sprite.scene, shipData, colorData.color));
    }

    // Key of the texture of the ship with its secondary parts colored. The texture is created on first use
    private static getColoredTextureKey(scene: Scene, shipData: PlayerShipData, color: string): string {
        const key: string = ShipAppearance.getTextureName(shipData, color);
        if (!scene.textures.exists(key))
            ShipAppearance.createColoredTexture(scene, shipData, color);

        return key;
    }

    private static getTextureName(shipData: PlayerShipData, color: string): string {
        return shipData.texture + '-' + color;
    }

    private static createColoredTexture(scene: Scene, shipData: PlayerShipData, color: string) {
        const frame = scene.textures.getFrame(GameConstants.ATLAS_KEY, shipData.texture);
        const centerX: number = frame.width / 2;
        const centerY: number = frame.height / 2;
        const texture = scene.textures.addDynamicTexture(ShipAppearance.getTextureName(shipData, color), frame.width, frame.height)!;

        texture.stamp(GameConstants.ATLAS_KEY, shipData.texture, centerX, centerY);
        // Tinting multiplies the colors: on grey parts, we get exactly the chosen color
        texture.stamp(GameConstants.ATLAS_KEY, shipData.accentTexture, centerX, centerY,
            {tint: Display.Color.HexStringToColor(color).color});
    }
}
