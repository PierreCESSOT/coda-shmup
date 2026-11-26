import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import KillStreak from "../components/KillStreak.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class MainUIScene extends Scene {
    private static readonly PLAYER_HEALTH_BAR_WIDTH: number = 420;

    private _playerHealthText: GameObjects.Text;
    private _playerHealthBar: GameObjects.Rectangle;
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
        this.game.events.on(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
        this.game.events.on(GameConstants.Events.BOSS_SPAWNED_EVENT, this.onBossSpawned, this);
        this.game.events.on(GameConstants.Events.BOSS_FINISHER_READY_EVENT, this.onBossFinisherReady, this);
        this.game.events.on(GameConstants.Events.BOSS_KILLED_EVENT, this.onBossKilled, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
            this.game.events.off(GameConstants.Events.BOSS_SPAWNED_EVENT, this.onBossSpawned, this);
            this.game.events.off(GameConstants.Events.BOSS_FINISHER_READY_EVENT, this.onBossFinisherReady, this);
            this.game.events.off(GameConstants.Events.BOSS_KILLED_EVENT, this.onBossKilled, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
        }, this);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const playerHealthIcon = this.add.image(64, 64, "sprites", "playerLife1_blue")
            .setOrigin(0, 0).setScale(1.5);
        const barX: number = playerHealthIcon.x + playerHealthIcon.displayWidth + 24;
        const barY: number = playerHealthIcon.y + playerHealthIcon.displayHeight / 2;
        this.add.rectangle(barX, barY, MainUIScene.PLAYER_HEALTH_BAR_WIDTH, 40, 0x000000, 0.6)
            .setOrigin(0, 0.5).setStrokeStyle(4, 0xffffff);
        this._playerHealthBar = this.add.rectangle(barX, barY, MainUIScene.PLAYER_HEALTH_BAR_WIDTH, 40, 0x5cff7a)
            .setOrigin(0, 0.5);
        this._playerHealthText = this.add.text(barX + MainUIScene.PLAYER_HEALTH_BAR_WIDTH / 2, barY, "",
            {fontSize: '32px', color: '#fff', fontFamily: 'future', stroke: '#000', strokeThickness: 6}).setOrigin(0.5);

        let scoreStr: string = "".padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        if (this.registry.has(RegistryConstants.Keys.PLAYER_SCORE))
            scoreStr = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString()
                .padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText = this.add.bitmapText(this.scale.width - 64, 64, "future-bmp", scoreStr, 128)
            .setOrigin(1, 0);

        // The bitmap font only contains digits and 'x': use the TTF version for words
        this._streakText = this.add.text(this.scale.width - 64, 208, "",
            {fontSize: '48px', color: '#fff', fontFamily: 'future'}).setOrigin(1, 0);
        this._streakKillText = this.add.text(this.scale.width / 2, this.scale.height / 3, "STREAKILL!",
            {fontSize: '120px', color: '#4de8ff', fontFamily: 'future'}).setOrigin(0.5).setVisible(false);

        const centerX: number = this.scale.width / 2;
        const barWidth: number = this.scale.width - 256;
        this._bossNameText = this.add.text(centerX, 300, "", {fontSize: '48px', color: '#fff', fontFamily: 'future'})
            .setOrigin(0.5);
        this._bossHealthBarBackground = this.add.rectangle(centerX, 360, barWidth, 32, 0x000000, 0.6)
            .setStrokeStyle(4, 0xffffff);
        this._bossHealthBar = this.add.rectangle(centerX - barWidth / 2, 360, barWidth, 32, 0xff5050)
            .setOrigin(0, 0.5);
        this._finisherText = this.add.text(centerX, this.scale.height - 360, "HOLD F TO CHARGE THE LASER!",
            {fontSize: '48px', color: '#ff4dff', fontFamily: 'future'}).setOrigin(0.5);
        this.setBossHudVisible(false);

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private onPlayerScoreChanged(_: any, value: number) {
        const scoreStr: string = value.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText.setText(scoreStr);
    }

    private onPlayerSpawned(player: Player) {
        const health = player.getComponent(Health);
        if (health) {
            this.updatePlayerHealth(health);
            health.on(Health.CHANGE_EVENT, () => this.updatePlayerHealth(health), this);
        }

        const killStreak = player.getComponent(KillStreak);
        if (killStreak) {
            this.onStreakChanged(killStreak);
            killStreak.on(KillStreak.CHANGE_EVENT, () => this.onStreakChanged(killStreak), this);
            killStreak.on(KillStreak.START_EVENT, this.onStreakStarted, this);
            killStreak.on(KillStreak.END_EVENT, this.onStreakEnded, this);
        }
    }

    private updatePlayerHealth(health: Health) {
        const ratio: number = health.current / health.max;
        this._playerHealthBar.setScale(ratio, 1);
        // Green, then yellow, then red as health goes down
        this._playerHealthBar.setFillStyle(ratio > 0.5 ? 0x5cff7a : ratio > 0.25 ? 0xffd93c : 0xff5050);
        this._playerHealthText.setText(Math.ceil(health.current) + " / " + health.max);
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
        this._bossHealthBar.setScale(1, 1).setFillStyle(0xff5050);
        this.setBossHudVisible(true);

        const health = boss.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, (current: number) => {
            this._bossHealthBar.setScale(current / health.max, 1);
        }, this);
    }

    private onBossFinisherReady() {
        this._bossHealthBar.setFillStyle(0xff4dff);
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
                {y: 360, scale: 0.6, alpha: 0.8, ease: 'Quad.easeInOut', duration: 500, delay: 800}
            ]
        });
    }

    private onStreakEnded() {
        this.tweens.killTweensOf(this._streakKillText);
        this._streakKillText.setVisible(false);
    }
}