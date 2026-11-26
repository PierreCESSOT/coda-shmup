import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import KillStreak from "../components/KillStreak.ts";
import Player from "../entities/Player.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class MainUIScene extends Scene {
    private _playerHealthText: GameObjects.BitmapText;
    private _scoreText: GameObjects.BitmapText;
    private _streakText: GameObjects.Text;
    private _streakKillText: GameObjects.Text;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_UI);
    }

    // noinspection JSUnusedGlobalSymbols
    init() {
        this.game.events.on(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
        }, this);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const playerHealthIcon = this.add.image(64, 64, "sprites", "playerLife1_blue")
            .setOrigin(0, 0).setScale(1.5);
        const playerHealthTextX = playerHealthIcon.x + playerHealthIcon.displayWidth + 16;
        this._playerHealthText = this.add.bitmapText(playerHealthTextX, 64, "future-bmp", "x0", 128);

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

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private onPlayerScoreChanged(_: any, value: number) {
        const scoreStr: string = value.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText.setText(scoreStr);
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