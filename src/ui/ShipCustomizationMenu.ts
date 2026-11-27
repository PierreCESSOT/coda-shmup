import {GameObjects, Scene} from 'phaser';
import SaveManager from "../managers/SaveManager.ts";
import {PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveConstants from "../SaveConstants.ts";

/**
 * Ship customization menu, on the home screen.
 *  - Left / right: changes the design (playerShips.json)
 *  - Up / down: changes the color (shipColors.json)
 *
 * The choice is:
 *  - saved (SaveManager), to be found again in the next game
 *  - put in the registry, where the Player reads it when the game starts
 */
export default class ShipCustomizationMenu {
    private static readonly PREVIEW_ANGLE: number = -90;
    private static readonly PREVIEW_SCALE: number = 3;
    private static readonly COLOR_NAME_OFFSET_Y: number = 200;
    private static readonly CONTROLS_HINT_OFFSET_Y: number = 280;

    private readonly _scene: Scene;
    private readonly _saveManager: SaveManager;
    private readonly _shipsData: PlayerShipsData;
    private readonly _shipIds: string[];
    private readonly _colors: ShipColorData[];
    private _preview: GameObjects.Sprite;
    private _colorText: GameObjects.Text;
    private _shipIndex: number = 0;
    private _colorIndex: number = 0;

    public constructor(scene: Scene, saveManager: SaveManager) {
        this._scene = scene;
        this._saveManager = saveManager;
        this._shipsData = scene.cache.json.get(GameConstants.DataKeys.PLAYER_SHIPS) as PlayerShipsData;
        this._shipIds = Object.keys(this._shipsData);
        this._colors = scene.cache.json.get(GameConstants.DataKeys.SHIP_COLORS) as ShipColorData[];

        this.restoreSavedChoice();
        this.createTexts();
        this.bindKeys();

        this.applyChoice();
    }

    // Restores the last choice
    private restoreSavedChoice() {
        this._saveManager.load();

        const savedShipId: string = String(this._saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_ID) ?? this._shipIds[0]);
        this._shipIndex = Math.max(0, this._shipIds.indexOf(savedShipId));

        const savedColor: number = Number(this._saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_COLOR) ?? 0);
        this._colorIndex = Phaser.Math.Clamp(savedColor, 0, this._colors.length - 1);
    }

    private createTexts() {
        const centerX: number = this._scene.scale.width / 2;
        const previewY: number = this._scene.scale.height / 2;

        this._preview = this._scene.add.sprite(centerX, previewY, GameConstants.ATLAS_KEY)
            .setAngle(ShipCustomizationMenu.PREVIEW_ANGLE).setScale(ShipCustomizationMenu.PREVIEW_SCALE);
        this._colorText = this._scene.add.text(centerX, previewY + ShipCustomizationMenu.COLOR_NAME_OFFSET_Y, '',
            {fontSize: '40px', color: '#fff'}).setOrigin(0.5);
        this._scene.add.text(centerX, previewY + ShipCustomizationMenu.CONTROLS_HINT_OFFSET_Y,
            'LEFT / RIGHT : design    UP / DOWN : color', {fontSize: '28px', color: '#aaa'}).setOrigin(0.5);
    }

    private bindKeys() {
        const keyboard = this._scene.input.keyboard;
        keyboard?.on('keydown-LEFT', () => this.changeShip(-1));
        keyboard?.on('keydown-RIGHT', () => this.changeShip(1));
        keyboard?.on('keydown-UP', () => this.changeColor(-1));
        keyboard?.on('keydown-DOWN', () => this.changeColor(1));
    }

    // Wraps around: after the last one, back to the first one (and the other way around)
    private changeShip(direction: number) {
        this._shipIndex = Phaser.Math.Wrap(this._shipIndex + direction, 0, this._shipIds.length);
        this.applyChoice();
    }

    private changeColor(direction: number) {
        this._colorIndex = Phaser.Math.Wrap(this._colorIndex + direction, 0, this._colors.length);
        this.applyChoice();
    }

    private applyChoice() {
        const shipId: string = this._shipIds[this._shipIndex];

        this.updatePreview(shipId);
        this.shareAndSaveChoice(shipId);
    }

    private updatePreview(shipId: string) {
        const color: ShipColorData = this._colors[this._colorIndex];

        ShipAppearance.apply(this._preview, this._shipsData[shipId], color);
        this._colorText.setText('< ' + color.name + ' >');
    }

    // Shares the choice with the game through the registry, and saves it for the next session
    private shareAndSaveChoice(shipId: string) {
        this._scene.registry.set(RegistryConstants.Keys.PLAYER_SHIP_ID, Number(shipId));
        this._scene.registry.set(RegistryConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);

        this._saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_ID, shipId, false);
        this._saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);
    }
}
