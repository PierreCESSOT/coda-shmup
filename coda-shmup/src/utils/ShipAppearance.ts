import {Display, GameObjects} from 'phaser';
import {PlayerShipData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";

export default class ShipAppearance {
    /**
     * Applique le design et la couleur à n'importe quel sprite (le joueur, ou l'aperçu du menu).
     *
     * La couleur ne touche que les parties secondaires : on crée une nouvelle texture
     * en dessinant le vaisseau d'origine, puis par-dessus ses parties secondaires colorées.
     * Cette texture est gardée en mémoire et réutilisée ensuite.
     */
    static apply(sprite: GameObjects.Sprite, shipData: PlayerShipData, colorData: ShipColorData) {
        sprite.clearTint();

        if (colorData.color === null) {
            sprite.setTexture('sprites', shipData.texture);
            return;
        }

        const key: string = shipData.texture + '-' + colorData.color;
        const textures = sprite.scene.textures;
        if (!textures.exists(key)) {
            const frame = textures.getFrame('sprites', shipData.texture);
            const centerX: number = frame.width / 2;
            const centerY: number = frame.height / 2;
            const texture = textures.addDynamicTexture(key, frame.width, frame.height)!;

            texture.stamp('sprites', shipData.texture, centerX, centerY);
            // Teinter multiplie les couleurs : sur des parties grises, on obtient exactement la couleur choisie
            texture.stamp('sprites', shipData.accentTexture, centerX, centerY,
                {tint: Display.Color.HexStringToColor(colorData.color).color});
        }

        sprite.setTexture(key);
    }
}
