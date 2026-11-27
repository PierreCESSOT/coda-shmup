import {Scene} from "phaser";
import SaveManager from "../../managers/SaveManager.ts";
import {PlayerShipData, PlayerShipsData} from "../../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../../gameData/ShipColorData.ts";
import GameConstants from "../../GameConstants.ts";
import RegistryConstants from "../../RegistryConstants.ts";
import SaveConstants from "../../SaveConstants.ts";

/**
 * The design and the color of the ship chosen on the title screen (playerShips.json, shipColors.json).
 *
 * The choice is:
 *  - saved (SaveManager), to be found again in the next game
 *  - put in the registry, where the Player reads it when the game starts
 */
export default class ShipSelection {
    private readonly _scene: Scene;
    private readonly _saveManager: SaveManager;
    private readonly _shipsData: PlayerShipsData;
    private readonly _shipIds: string[];
    private readonly _colors: ShipColorData[];
    private _shipIndex: number = 0;
    private _colorIndex: number = 0;

    public constructor(scene: Scene, saveManager: SaveManager) {
        this._scene = scene;
        this._saveManager = saveManager;
        this._shipsData = scene.cache.json.get(GameConstants.DataKeys.PLAYER_SHIPS) as PlayerShipsData;
        this._shipIds = Object.keys(this._shipsData);
        this._colors = scene.cache.json.get(GameConstants.DataKeys.SHIP_COLORS) as ShipColorData[];

        this.restoreSavedChoice();
        this.shareAndSave();
    }

    // Every ship, in the order of playerShips.json
    public get ships(): PlayerShipData[] {
        return this._shipIds.map(id => this._shipsData[id]);
    }

    public get ship(): PlayerShipData {
        return this._shipsData[this._shipIds[this._shipIndex]];
    }

    public get color(): ShipColorData {
        return this._colors[this._colorIndex];
    }

    // Wraps around: after the last one, back to the first one (and the other way around)
    public changeShip(direction: number) {
        this._shipIndex = Phaser.Math.Wrap(this._shipIndex + direction, 0, this._shipIds.length);
        this.shareAndSave();
    }

    public changeColor(direction: number) {
        this._colorIndex = Phaser.Math.Wrap(this._colorIndex + direction, 0, this._colors.length);
        this.shareAndSave();
    }

    // Restores the last choice
    private restoreSavedChoice() {
        this._saveManager.load();

        const savedShipId: string = String(this._saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_ID) ?? this._shipIds[0]);
        this._shipIndex = Math.max(0, this._shipIds.indexOf(savedShipId));

        const savedColor: number = Number(this._saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_COLOR) ?? 0);
        this._colorIndex = Phaser.Math.Clamp(savedColor, 0, this._colors.length - 1);
    }

    // Shares the choice with the game through the registry, and saves it for the next session
    private shareAndSave() {
        const shipId: string = this._shipIds[this._shipIndex];

        this._scene.registry.set(RegistryConstants.Keys.PLAYER_SHIP_ID, Number(shipId));
        this._scene.registry.set(RegistryConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);

        this._saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_ID, shipId, false);
        this._saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);
    }
}
