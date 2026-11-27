import {GameObjects, Loader} from "phaser";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveConstants from "../SaveConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import {PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";

export default class HomeScene extends Phaser.Scene {
    private static readonly PROGRESS_BAR_HEIGHT: number = 64;
    private static readonly PROGRESS_BOX_COLOR: number = 0x222222;
    private static readonly PROGRESS_BOX_ALPHA: number = 0.8;
    private static readonly SHIP_PREVIEW_ANGLE: number = -90;
    private static readonly SHIP_PREVIEW_SCALE: number = 3;
    private static readonly COLOR_NAME_OFFSET_Y: number = 200;
    private static readonly CONTROLS_HINT_OFFSET_Y: number = 280;

    private saveManager: SaveManager;

    private _shipIds: string[];
    private _shipColors: ShipColorData[];
    private _shipIndex: number = 0;
    private _colorIndex: number = 0;
    private _shipPreview: GameObjects.Sprite;
    private _colorText: GameObjects.Text;

    constructor() {
        super(GameConstants.SceneKeys.HOME);
    }

    preload() {
        this.showLoadingProgress();
        this.loadAssets();
    }

    create() {
        this.add.text(this.scale.width / 2, this.scale.width / 2, 'CODA SHMUP',
            {fontSize: '72px', color: '#fff', fontFamily: GameConstants.FontKeys.TRUETYPE}).setOrigin(0.5);
        this.add.text(this.scale.width / 2, this.scale.width / 2 + 72, 'Press SPACE to start',
            {fontSize: '32px', color: '#fff'}).setOrigin(0.5);

        this.createShipCustomization();

        // Ignore the OS key repeat: SPACE may still be held from the previous game
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
            if (event.repeat)
                return;

            this.scene.launch(GameConstants.SceneKeys.MAIN_UI);
            this.scene.start(GameConstants.SceneKeys.MAIN_GAME);
        });

        console.log("HomeScene created");
    }

    private showLoadingProgress() {
        const width: number = this.scale.width;
        const y: number = this.scale.height / 2;
        const barHeight: number = HomeScene.PROGRESS_BAR_HEIGHT;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(HomeScene.PROGRESS_BOX_COLOR, HomeScene.PROGRESS_BOX_ALPHA);
        progressBox.fillRect(0, y, width, barHeight);
        this.load.on(Loader.Events.PROGRESS, function (value: number) { // 0-1
            console.log("Loading : " + value);

            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(0, y, width * value, barHeight);
        });
        this.load.on(Loader.Events.COMPLETE, function () {
            console.log("Loading complete");

            progressBar.destroy();
            progressBox.destroy();
        });
    }

    private loadAssets() {
        const {DataKeys, AudioKeys, FontKeys, ATLAS_KEY} = GameConstants;

        this.load.setPath('assets');

        this.load.image('bg', 'Backgrounds/darkPurple.png');
        this.load.image('planet', 'Planets/planet00.png');
        this.load.atlas(ATLAS_KEY, 'Spritesheet/gameSprites.png', 'Spritesheet/gameSprites.json');
        this.load.bitmapFont(FontKeys.BITMAP, 'Fonts/kenvector_future.png', 'Fonts/kenvector_future.xml');
        this.load.font(FontKeys.TRUETYPE, 'Fonts/kenvector_future.ttf');
        this.load.json(DataKeys.PLAYER_SHIPS, 'Data/playerShips.json');
        this.load.json(DataKeys.PLAYER, 'Data/player.json');
        this.load.json(DataKeys.ENEMIES, 'Data/enemies.json');
        this.load.json(DataKeys.SHIP_COLORS, 'Data/shipColors.json');
        this.load.json(DataKeys.POWER_UPS, 'Data/powerups.json');
        this.load.json(DataKeys.BOSSES, 'Data/bosses.json');
        this.load.audio(AudioKeys.PLAYER_SHOOT, 'Sounds/sfx_laser1.ogg');
        this.load.audio(AudioKeys.ENEMY_SHOOT, 'Sounds/sfx_laser2.ogg');
    }

    private getShipsData(): PlayerShipsData {
        return this.cache.json.get(GameConstants.DataKeys.PLAYER_SHIPS) as PlayerShipsData;
    }

    private createShipCustomization() {
        this._shipIds = Object.keys(this.getShipsData());
        this._shipColors = this.cache.json.get(GameConstants.DataKeys.SHIP_COLORS) as ShipColorData[];

        this.restoreSavedCustomization();
        this.createCustomizationTexts();
        this.bindCustomizationKeys();

        this.applyShipCustomization();
    }

    // Restore the last customization
    private restoreSavedCustomization() {
        this.saveManager.load();

        const savedShipId: string = String(this.saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_ID) ?? this._shipIds[0]);
        this._shipIndex = Math.max(0, this._shipIds.indexOf(savedShipId));
        this._colorIndex = Phaser.Math.Clamp(Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_COLOR) ?? 0),
            0, this._shipColors.length - 1);
    }

    private createCustomizationTexts() {
        const centerX: number = this.scale.width / 2;
        const previewY: number = this.scale.height / 2;

        this._shipPreview = this.add.sprite(centerX, previewY, GameConstants.ATLAS_KEY)
            .setAngle(HomeScene.SHIP_PREVIEW_ANGLE).setScale(HomeScene.SHIP_PREVIEW_SCALE);
        this._colorText = this.add.text(centerX, previewY + HomeScene.COLOR_NAME_OFFSET_Y, '',
            {fontSize: '40px', color: '#fff'}).setOrigin(0.5);
        this.add.text(centerX, previewY + HomeScene.CONTROLS_HINT_OFFSET_Y, 'LEFT / RIGHT : design    UP / DOWN : color',
            {fontSize: '28px', color: '#aaa'}).setOrigin(0.5);
    }

    private bindCustomizationKeys() {
        this.input.keyboard?.on('keydown-LEFT', () => this.changeShip(-1));
        this.input.keyboard?.on('keydown-RIGHT', () => this.changeShip(1));
        this.input.keyboard?.on('keydown-UP', () => this.changeColor(-1));
        this.input.keyboard?.on('keydown-DOWN', () => this.changeColor(1));
    }

    private changeShip(direction: number) {
        this._shipIndex = Phaser.Math.Wrap(this._shipIndex + direction, 0, this._shipIds.length);
        this.applyShipCustomization();
    }

    private changeColor(direction: number) {
        this._colorIndex = Phaser.Math.Wrap(this._colorIndex + direction, 0, this._shipColors.length);
        this.applyShipCustomization();
    }

    private applyShipCustomization() {
        const shipId: string = this._shipIds[this._shipIndex];

        this.updatePreview(shipId);
        this.shareAndSaveCustomization(shipId);
    }

    private updatePreview(shipId: string) {
        const colorData: ShipColorData = this._shipColors[this._colorIndex];

        ShipAppearance.apply(this._shipPreview, this.getShipsData()[shipId], colorData);
        this._colorText.setText('< ' + colorData.name + ' >');
    }

    // Shares the choice with the game through the registry, and saves it for the next session
    private shareAndSaveCustomization(shipId: string) {
        this.registry.set(RegistryConstants.Keys.PLAYER_SHIP_ID, Number(shipId));
        this.registry.set(RegistryConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);

        this.saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_ID, shipId, false);
        this.saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);
    }
}
