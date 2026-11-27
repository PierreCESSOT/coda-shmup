import {Loader} from "phaser";
import GameConstants from "../GameConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import TitleScreen from "../ui/title/TitleScreen.ts";

export default class HomeScene extends Phaser.Scene {
    private static readonly PROGRESS_BAR_HEIGHT: number = 64;
    private static readonly PROGRESS_BOX_COLOR: number = 0x222222;
    private static readonly PROGRESS_BOX_ALPHA: number = 0.8;

    private saveManager: SaveManager;

    constructor() {
        super(GameConstants.SceneKeys.HOME);
    }

    preload() {
        this.showLoadingProgress();
        this.loadAssets();
    }

    create() {
        new TitleScreen(this, this.saveManager);

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
        this.load.font(FontKeys.AUDIOWIDE, 'Fonts/Audiowide-Regular.ttf');
        this.load.font(FontKeys.SILKSCREEN, 'Fonts/Silkscreen-Regular.ttf');
        this.load.font(FontKeys.SPACE_MONO, 'Fonts/SpaceMono-Regular.ttf');
        this.load.json(DataKeys.PLAYER_SHIPS, 'Data/playerShips.json');
        this.load.json(DataKeys.PLAYER, 'Data/player.json');
        this.load.json(DataKeys.ENEMIES, 'Data/enemies.json');
        this.load.json(DataKeys.SHIP_COLORS, 'Data/shipColors.json');
        this.load.json(DataKeys.POWER_UPS, 'Data/powerups.json');
        this.load.json(DataKeys.BOSSES, 'Data/bosses.json');
        this.load.audio(AudioKeys.PLAYER_SHOOT, 'Sounds/sfx_laser1.ogg');
        this.load.audio(AudioKeys.ENEMY_SHOOT, 'Sounds/sfx_laser2.ogg');
    }
}
