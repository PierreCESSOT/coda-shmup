import {GameObjects, Loader} from "phaser";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveConstants from "../SaveConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import {PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";

export default class HomeScene extends Phaser.Scene {
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
        const width: number = this.scale.width;
        const y: number = this.scale.height / 2;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(0, y, width, 64);
        this.load.on(Loader.Events.PROGRESS, function (value: number) { // 0-1
            console.log("Loading : " + value);

            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(0, y, width * value, 64);
        });
        this.load.on(Loader.Events.COMPLETE, function () {
            console.log("Loading complete");

            progressBar.destroy();
            progressBox.destroy();
        });

        this.load.setPath('assets');

        this.load.image('bg', 'Backgrounds/darkPurple.png');
        this.load.image('planet', 'Planets/planet00.png');
        this.load.atlas('sprites', 'Spritesheet/gameSprites.png', 'Spritesheet/gameSprites.json');
        this.load.bitmapFont('future-bmp', 'Fonts/kenvector_future.png', 'Fonts/kenvector_future.xml');
        this.load.font('future', 'Fonts/kenvector_future.ttf');
        this.load.json('playerShips', 'Data/playerShips.json');
        this.load.json('enemies', 'Data/enemies.json');
        this.load.json('shipColors', 'Data/shipColors.json');
        this.load.json('streak', 'Data/streak.json');
        this.load.audio('sfx_laser1', 'Sounds/sfx_laser1.ogg');
        this.load.audio('sfx_laser2', 'Sounds/sfx_laser2.ogg');
    }

    create() {
        this.add.text(this.scale.width / 2, this.scale.width / 2, 'CODA SHMUP',
            {fontSize: '72px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5);
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

    private createShipCustomization() {
        this._shipIds = Object.keys(this.cache.json.get('playerShips') as PlayerShipsData);
        this._shipColors = this.cache.json.get('shipColors') as ShipColorData[];

        // Restore the last customization
        this.saveManager.load();
        const savedShipId: string = String(this.saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_ID) ?? this._shipIds[0]);
        this._shipIndex = Math.max(0, this._shipIds.indexOf(savedShipId));
        this._colorIndex = Phaser.Math.Clamp(Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_COLOR) ?? 0),
            0, this._shipColors.length - 1);

        const centerX: number = this.scale.width / 2;
        const previewY: number = this.scale.height / 2;
        this._shipPreview = this.add.sprite(centerX, previewY, 'sprites').setAngle(-90).setScale(3);
        this._colorText = this.add.text(centerX, previewY + 200, '', {fontSize: '40px', color: '#fff'}).setOrigin(0.5);
        this.add.text(centerX, previewY + 280, 'LEFT / RIGHT : design    UP / DOWN : color',
            {fontSize: '28px', color: '#aaa'}).setOrigin(0.5);

        this.input.keyboard?.on('keydown-LEFT', () => this.changeShip(-1));
        this.input.keyboard?.on('keydown-RIGHT', () => this.changeShip(1));
        this.input.keyboard?.on('keydown-UP', () => this.changeColor(-1));
        this.input.keyboard?.on('keydown-DOWN', () => this.changeColor(1));

        this.applyShipCustomization();
    }

    private changeShip(direction: number) {
        this._shipIndex = Phaser.Math.Wrap(this._shipIndex + direction, 0, this._shipIds.length);
        this.applyShipCustomization();
    }

    private changeColor(direction: number) {
        this._colorIndex = Phaser.Math.Wrap(this._colorIndex + direction, 0, this._shipColors.length);
        this.applyShipCustomization();
    }

    // Updates the preview, shares the choice with the game through the registry and saves it
    private applyShipCustomization() {
        const shipId: string = this._shipIds[this._shipIndex];
        const shipsData = this.cache.json.get('playerShips') as PlayerShipsData;
        const colorData: ShipColorData = this._shipColors[this._colorIndex];

        ShipAppearance.apply(this._shipPreview, shipsData[shipId], colorData);
        this._colorText.setText('< ' + colorData.name + ' >');

        this.registry.set(RegistryConstants.Keys.PLAYER_SHIP_ID, Number(shipId));
        this.registry.set(RegistryConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);

        this.saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_ID, shipId, false);
        this.saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);
    }
}
