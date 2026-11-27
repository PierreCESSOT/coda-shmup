import {Geom, Physics, Scene, Scenes} from "phaser";
import Health from "../components/Health.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import type {BossData, BossesData} from "../gameData/BossesData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

/**
 * The conductor of the bosses:
 *  - WHEN: a boss arrives every "scoreInterval" points
 *  - WHICH: the bosses in a loop, in the order of the JSON file
 *  - HOW MUCH HEALTH: a bit more each time all the bosses have been beaten, the run is infinite
 *  - THE END: arms the charged laser of the player, checks if it hits, and rewards the player
 */
export default class BossDirector {
    private static readonly BOSS_DEATH_DURATION: number = 500;

    private readonly _scene: Scene;
    private readonly _player: Player;
    private readonly _enemyBullets: Physics.Arcade.Group;
    private readonly _data: BossesData;
    private readonly _bosses: Physics.Arcade.Group;

    private _currentBoss: Boss | undefined;
    private _bossCount: number = 0;         // Bosses already beaten
    private _nextBossScore: number;

    // Physics group of the bosses, for the collisions
    public get bosses(): Physics.Arcade.Group {
        return this._bosses;
    }

    public get isBossFightActive(): boolean {
        return this._currentBoss !== undefined;
    }

    public constructor(scene: Scene, player: Player, enemyBullets: Physics.Arcade.Group) {
        this._scene = scene;
        this._player = player;
        this._enemyBullets = enemyBullets;
        this._data = scene.cache.json.get(GameConstants.DataKeys.BOSSES) as BossesData;
        this._bosses = scene.physics.add.group();
        this._nextBossScore = this._data.scoreInterval;

        player.getComponent(ChargeLaser)?.on(ChargeLaser.FIRE_EVENT, this.onLaserFired, this);

        // The registry is global to the game: stop listening when the scene shuts down
        const registryEvents = scene.registry.events;
        registryEvents.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        scene.events.once(Scenes.Events.SHUTDOWN, () => {
            registryEvents.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        });
    }

    private onScoreChanged(_parent: unknown, score: number) {
        if (!this.isBossFightActive && score >= this._nextBossScore)
            this.spawnBoss();
    }

    private spawnBoss() {
        const bossData = this.takeNextBossData();
        const boss = this.createBoss(bossData);
        this._currentBoss = boss;

        boss.once(Boss.FINISHER_READY_EVENT, () => this.onFinisherReady(boss));
        boss.getComponent(Health)?.once(Health.DEATH_EVENT, () => this.onBossKilled(boss));

        this._scene.game.events.emit(GameConstants.Events.BOSS_SPAWNED_EVENT, boss);
        console.log("[BossDirector] Boss spawned: " + bossData.name);
    }

    // Infinite run: the bosses loop, in the order of the JSON file
    private takeNextBossData(): BossData {
        const bosses = this._data.bosses;
        return bosses[this._bossCount % bosses.length];
    }

    // Infinite run: a boss gets more health each time all the bosses have been beaten
    private getBossHealth(bossData: BossData): number {
        const cycle: number = Math.floor(this._bossCount / this._data.bosses.length);
        return Math.round(bossData.health * (1 + this._data.healthGrowthPerCycle * cycle));
    }

    private createBoss(bossData: BossData): Boss {
        const boss = new Boss(this._scene, 0, 0, GameConstants.ATLAS_KEY, bossData.texture);
        boss.init({
            bulletsGroup: this._enemyBullets,
            data: bossData,
            health: this.getBossHealth(bossData),
            finisherThreshold: this._data.finisher.healthThreshold,
            target: this._player
        });
        this._bosses.add(boss);
        boss.enable(this._scene.cameras.main.centerX, 0);

        return boss;
    }

    private onFinisherReady(boss: Boss) {
        this._player.getComponent(ChargeLaser)?.arm();
        this._scene.game.events.emit(GameConstants.Events.BOSS_FINISHER_READY_EVENT, boss);
    }

    // The beam is a thick line: grow the boss hit circle by half of its width
    private onLaserFired(beam: Geom.Line) {
        const boss = this._currentBoss;
        if (!boss || !boss.isFinisherReady)
            return;

        const beamWidth: number = this._player.getComponent(ChargeLaser)?.beamWidth ?? 0;
        const hitCircle = new Geom.Circle(boss.x, boss.y, boss.arcadeBody.halfWidth + beamWidth / 2);
        if (Geom.Intersects.LineToCircle(beam, hitCircle))
            boss.finish();
    }

    private onBossKilled(boss: Boss) {
        this._currentBoss = undefined;
        this._bossCount++;
        const score: number = Number(this._scene.registry.get(RegistryConstants.Keys.PLAYER_SCORE));
        this._nextBossScore = score + this._data.scoreInterval;

        this._player.getComponent(ChargeLaser)?.disarm();
        this.rewardPlayer();

        this._scene.game.events.emit(GameConstants.Events.BOSS_KILLED_EVENT, boss);
        console.log("[BossDirector] Boss killed: " + boss.bossName);

        // Bosses are not pooled: destroy it once its death feedback is over
        this._scene.time.delayedCall(BossDirector.BOSS_DEATH_DURATION, () => boss.destroy());
    }

    // Reward: more max health
    private rewardPlayer() {
        const bonusData = (this._scene.cache.json.get(GameConstants.DataKeys.PLAYER) as PlayerData).healthBonus;
        this._player.applyHealthBonus(bonusData.boss);
    }
}
