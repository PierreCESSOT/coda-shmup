import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import PlayerHealthBar from "../ui/PlayerHealthBar.ts";
import {futureText} from "../ui/TextStyles.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

type EventBinding = {
    emitter: Phaser.Events.EventEmitter;
    event: string;
    handler: Function;
}

/**
 * The interface, displayed on top of the game scene.
 *
 * It only listens to events (player created, boss created, score...) and passes them on
 * to the widgets of the ui/ folder. The game does not depend on it: it would run without.
 */
export default class MainUIScene extends Scene {
    private static readonly SCREEN_MARGIN: number = 64;
    private static readonly BITMAP_FONT_SIZE: number = 128;
    private static readonly HUD_TEXT_FONT_SIZE: number = 48;
    private static readonly BOSS_NAME_Y: number = 300;
    private static readonly BOSS_BAR_Y: number = 360;
    private static readonly BOSS_BAR_HEIGHT: number = 32;
    private static readonly BOSS_BAR_SIDE_MARGIN: number = 128;
    private static readonly BOSS_BAR_COLOR: number = 0xff5050;
    private static readonly FINISHER_COLOR: number = 0xff4dff;
    private static readonly FINISHER_TEXT_COLOR: string = '#ff4dff';
    private static readonly FINISHER_TEXT_DISTANCE_FROM_BOTTOM: number = 360;

    private _playerHealthBar: PlayerHealthBar;
    private _scoreText: GameObjects.BitmapText;
    private _bossNameText: GameObjects.Text;
    private _bossHealthBar: GameObjects.Rectangle;
    private _bossHealthBarBackground: GameObjects.Rectangle;
    private _finisherText: GameObjects.Text;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_UI);
    }

    // noinspection JSUnusedGlobalSymbols
    init() {
        // The game and the registry outlive the scene: stop listening when it shuts down
        const bindings: EventBinding[] = this.getEventBindings();
        for (const {emitter, event, handler} of bindings)
            emitter.on(event, handler, this);

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            for (const {emitter, event, handler} of bindings)
                emitter.off(event, handler, this);
        }, this);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this.createPlayerHud();
        this.createBossHud();

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private getEventBindings(): EventBinding[] {
        const gameEvents = this.game.events;

        return [
            {emitter: gameEvents, event: GameConstants.Events.PLAYER_SPAWNED_EVENT, handler: this.onPlayerSpawned},
            {emitter: gameEvents, event: GameConstants.Events.BOSS_SPAWNED_EVENT, handler: this.onBossSpawned},
            {emitter: gameEvents, event: GameConstants.Events.BOSS_FINISHER_READY_EVENT, handler: this.onBossFinisherReady},
            {emitter: gameEvents, event: GameConstants.Events.BOSS_KILLED_EVENT, handler: this.onBossKilled},
            {emitter: this.registry.events, event: RegistryConstants.Events.PLAYER_SCORE_CHANGE, handler: this.onPlayerScoreChanged},
        ];
    }

    private createPlayerHud() {
        const margin: number = MainUIScene.SCREEN_MARGIN;

        this._playerHealthBar = new PlayerHealthBar(this);

        const currentScore: number = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0;
        this._scoreText = this.add.bitmapText(this.scale.width - margin, margin, GameConstants.FontKeys.BITMAP,
            this.formatScore(currentScore), MainUIScene.BITMAP_FONT_SIZE).setOrigin(1, 0);
    }

    private createBossHud() {
        const centerX: number = this.scale.width / 2;
        const barWidth: number = this.scale.width - MainUIScene.BOSS_BAR_SIDE_MARGIN * 2;

        this._bossNameText = this.add.text(centerX, MainUIScene.BOSS_NAME_Y, "",
            futureText(MainUIScene.HUD_TEXT_FONT_SIZE)).setOrigin(0.5);
        this._bossHealthBarBackground = this.add.rectangle(centerX, MainUIScene.BOSS_BAR_Y, barWidth,
            MainUIScene.BOSS_BAR_HEIGHT, 0x000000, 0.6).setStrokeStyle(4, 0xffffff);
        this._bossHealthBar = this.add.rectangle(centerX - barWidth / 2, MainUIScene.BOSS_BAR_Y, barWidth,
            MainUIScene.BOSS_BAR_HEIGHT, MainUIScene.BOSS_BAR_COLOR).setOrigin(0, 0.5);
        this._finisherText = this.add.text(centerX, this.scale.height - MainUIScene.FINISHER_TEXT_DISTANCE_FROM_BOTTOM,
            "HOLD F TO CHARGE THE LASER!",
            futureText(MainUIScene.HUD_TEXT_FONT_SIZE, MainUIScene.FINISHER_TEXT_COLOR)).setOrigin(0.5);
        this.setBossHudVisible(false);
    }

    private formatScore(score: number): string {
        return score.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
    }

    private onPlayerScoreChanged(_parent: unknown, score: number) {
        this._scoreText.setText(this.formatScore(score));
    }

    private onPlayerSpawned(player: Player) {
        const health = player.getComponent(Health);
        if (health)
            this._playerHealthBar.bind(health);
    }

    private setBossHudVisible(visible: boolean) {
        this._bossNameText.setVisible(visible);
        this._bossHealthBar.setVisible(visible);
        this._bossHealthBarBackground.setVisible(visible);
        if (!visible) {
            this.tweens.killTweensOf(this._finisherText);
            this._finisherText.setVisible(false);
        }
    }

    private onBossSpawned(boss: Boss) {
        this._bossNameText.setText(boss.bossName);
        this._bossHealthBar.setScale(1, 1).setFillStyle(MainUIScene.BOSS_BAR_COLOR);
        this.setBossHudVisible(true);

        const health = boss.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, (current: number) => {
            this._bossHealthBar.setScale(current / health.max, 1);
        }, this);
    }

    private onBossFinisherReady() {
        this._bossHealthBar.setFillStyle(MainUIScene.FINISHER_COLOR);
        this._finisherText.setVisible(true).setAlpha(1);
        this.tweens.add({
            targets: this._finisherText,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 400
        });
    }

    private onBossKilled() {
        this.setBossHudVisible(false);
    }
}
