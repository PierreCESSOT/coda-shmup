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

    private _playerHealthBar: PlayerHealthBar;
    private _scoreText: GameObjects.BitmapText;
    private _powerUpDisplay: PowerUpDisplay;
    private _bossHealthBar: BossHealthBar;

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
        this._powerUpDisplay = new PowerUpDisplay(this);
        this._bossHealthBar = new BossHealthBar(this);

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
