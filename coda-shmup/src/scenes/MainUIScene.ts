import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import PowerUpSlot from "../components/PowerUpSlot.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import PlayerHealthBar from "../ui/PlayerHealthBar.ts";
import PowerUpDisplay from "../ui/PowerUpDisplay.ts";
import BossHealthBar from "../ui/BossHealthBar.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

/**
 * L'interface, affichée par-dessus la scène de jeu.
 *
 * Elle ne fait qu'écouter des événements (joueur créé, boss créé, score...) et les transmettre
 * aux widgets du dossier ui/. Le jeu ne dépend pas d'elle : il tournerait sans.
 */
export default class MainUIScene extends Scene {
    private _scoreText: GameObjects.BitmapText;
    private _playerHealthBar: PlayerHealthBar;
    private _powerUpDisplay: PowerUpDisplay;
    private _bossHealthBar: BossHealthBar;

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

        // Ces événements sont globaux au jeu : on arrête d'écouter quand la scène s'arrête
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
        this._playerHealthBar = new PlayerHealthBar(this);
        this._powerUpDisplay = new PowerUpDisplay(this);
        this._bossHealthBar = new BossHealthBar(this);

        let scoreStr: string = "".padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        if (this.registry.has(RegistryConstants.Keys.PLAYER_SCORE))
            scoreStr = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString()
                .padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText = this.add.bitmapText(this.scale.width - 64, 64, "future-bmp", scoreStr, 128)
            .setOrigin(1, 0);

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private onPlayerScoreChanged(_: any, value: number) {
        const scoreStr: string = value.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText.setText(scoreStr);
    }

    private onPlayerSpawned(player: Player) {
        const health = player.getComponent(Health);
        if (health)
            this._playerHealthBar.bind(health);

        const powerUpSlot = player.getComponent(PowerUpSlot);
        if (powerUpSlot)
            this._powerUpDisplay.bind(powerUpSlot);
    }

    private onBossSpawned(boss: Boss) {
        this._bossHealthBar.show(boss);
    }

    private onBossFinisherReady() {
        this._bossHealthBar.showFinisherHint();
    }

    private onBossKilled() {
        this._bossHealthBar.hide();
    }
}
