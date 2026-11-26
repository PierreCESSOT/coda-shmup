import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import KillStreak from "../components/KillStreak.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

type EventBinding = {
    emitter: Phaser.Events.EventEmitter;
    event: string;
    handler: Function;
}

export default class MainUIScene extends Scene {
    private static readonly SCREEN_MARGIN: number = 64;
    private static readonly BITMAP_FONT_SIZE: number = 128;
    private static readonly HEALTH_ICON_SCALE: number = 1.5;
    private static readonly HEALTH_ICON_TEXT_GAP: number = 16;
    private static readonly HUD_TEXT_FONT_SIZE: number = 48;
    private static readonly STREAK_TEXT_Y: number = 208;
    private static readonly STREAK_BANNER_FONT_SIZE: number = 120;
    private static readonly STREAK_BANNER_COLOR: string = '#4de8ff';
    private static readonly STREAK_BANNER_DOCKED_Y: number = 360;
    private static readonly BOSS_NAME_Y: number = 300;
    private static readonly BOSS_BAR_Y: number = 360;
    private static readonly BOSS_BAR_HEIGHT: number = 32;
    private static readonly BOSS_BAR_SIDE_MARGIN: number = 128;
    private static readonly BOSS_BAR_COLOR: number = 0xff5050;
    private static readonly FINISHER_COLOR: number = 0xff4dff;
    private static readonly FINISHER_TEXT_COLOR: string = '#ff4dff';
    private static readonly FINISHER_TEXT_DISTANCE_FROM_BOTTOM: number = 360;

    private _playerHealthText: GameObjects.BitmapText;
    private _scoreText: GameObjects.BitmapText;
    private _streakText: GameObjects.Text;
    private _streakKillText: GameObjects.Text;
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
        this.createStreakHud();
        this.createBossHud();

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private static createTextStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
        return {fontSize: fontSize + 'px', color, fontFamily: GameConstants.FontKeys.TRUETYPE};
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

        const playerHealthIcon = this.add.image(margin, margin, GameConstants.ATLAS_KEY, "playerLife1_blue")
            .setOrigin(0, 0).setScale(MainUIScene.HEALTH_ICON_SCALE);
        const playerHealthTextX: number = playerHealthIcon.x + playerHealthIcon.displayWidth + MainUIScene.HEALTH_ICON_TEXT_GAP;
        this._playerHealthText = this.add.bitmapText(playerHealthTextX, margin, GameConstants.FontKeys.BITMAP, "x0",
            MainUIScene.BITMAP_FONT_SIZE);

        const currentScore: number = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0;
        this._scoreText = this.add.bitmapText(this.scale.width - margin, margin, GameConstants.FontKeys.BITMAP,
            this.formatScore(currentScore), MainUIScene.BITMAP_FONT_SIZE).setOrigin(1, 0);
    }

    // The bitmap font only contains digits and 'x': use the TTF version for words
    private createStreakHud() {
        this._streakText = this.add.text(this.scale.width - MainUIScene.SCREEN_MARGIN, MainUIScene.STREAK_TEXT_Y, "",
            MainUIScene.createTextStyle(MainUIScene.HUD_TEXT_FONT_SIZE, '#fff')).setOrigin(1, 0);
        this._streakKillText = this.add.text(this.scale.width / 2, this.scale.height / 3, "STREAKILL!",
            MainUIScene.createTextStyle(MainUIScene.STREAK_BANNER_FONT_SIZE, MainUIScene.STREAK_BANNER_COLOR))
            .setOrigin(0.5).setVisible(false);
    }

    private createBossHud() {
        const centerX: number = this.scale.width / 2;
        const barWidth: number = this.scale.width - MainUIScene.BOSS_BAR_SIDE_MARGIN * 2;

        this._bossNameText = this.add.text(centerX, MainUIScene.BOSS_NAME_Y, "",
            MainUIScene.createTextStyle(MainUIScene.HUD_TEXT_FONT_SIZE, '#fff')).setOrigin(0.5);
        this._bossHealthBarBackground = this.add.rectangle(centerX, MainUIScene.BOSS_BAR_Y, barWidth,
            MainUIScene.BOSS_BAR_HEIGHT, 0x000000, 0.6).setStrokeStyle(4, 0xffffff);
        this._bossHealthBar = this.add.rectangle(centerX - barWidth / 2, MainUIScene.BOSS_BAR_Y, barWidth,
            MainUIScene.BOSS_BAR_HEIGHT, MainUIScene.BOSS_BAR_COLOR).setOrigin(0, 0.5);
        this._finisherText = this.add.text(centerX, this.scale.height - MainUIScene.FINISHER_TEXT_DISTANCE_FROM_BOTTOM,
            "HOLD F TO CHARGE THE LASER!",
            MainUIScene.createTextStyle(MainUIScene.HUD_TEXT_FONT_SIZE, MainUIScene.FINISHER_TEXT_COLOR)).setOrigin(0.5);
        this.setBossHudVisible(false);
    }

    private formatScore(score: number): string {
        return score.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
    }

    private onPlayerScoreChanged(_parent: unknown, score: number) {
        this._scoreText.setText(this.formatScore(score));
    }

    private onPlayerSpawned(player: Player) {
        this._playerHealthText.setText("x" + player.getComponent(Health)?.current);

        player.getComponent(Health)?.on(Health.CHANGE_EVENT, (current: number) => {
            this._playerHealthText.setText("x" + current);
        }, this);

        const killStreak = player.getComponent(KillStreak);
        if (killStreak) {
            this.onStreakChanged(killStreak);
            killStreak.on(KillStreak.CHANGE_EVENT, () => this.onStreakChanged(killStreak), this);
            killStreak.on(KillStreak.START_EVENT, this.onStreakStarted, this);
            killStreak.on(KillStreak.END_EVENT, this.onStreakEnded, this);
        }
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

    private onStreakChanged(killStreak: KillStreak) {
        if (killStreak.count === 0)
            this._streakText.setText("");
        else if (killStreak.isActive)
            this._streakText.setText("STREAK x" + killStreak.count);
        else
            this._streakText.setText("STREAK " + killStreak.count + "/" + killStreak.killsRequired);
    }

    private onStreakStarted() {
        this.tweens.killTweensOf(this._streakKillText);
        this._streakKillText.setVisible(true).setAlpha(1).setScale(2).setY(this.scale.height / 3);

        // Pop in the middle of the screen, then move to the top while the streak lasts
        this.tweens.chain({
            targets: this._streakKillText,
            tweens: [
                {scale: 1, ease: 'Back.easeOut', duration: 400},
                {y: MainUIScene.STREAK_BANNER_DOCKED_Y, scale: 0.6, alpha: 0.8, ease: 'Quad.easeInOut', duration: 500, delay: 800}
            ]
        });
    }

    private onStreakEnded() {
        this.tweens.killTweensOf(this._streakKillText);
        this._streakKillText.setVisible(false);
    }
}
