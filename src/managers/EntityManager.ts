import {GameObjects, Geom, Plugins, Physics, Scene, Scenes} from "phaser";
import Health from "../components/Health.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Boss from "../entities/Boss.ts";
import type {BossData, BossesData} from "../gameData/BossesData.ts";
import Bullet from "../entities/Bullet.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Enemy from "../entities/Enemy.ts";
import SineEnemy from "../entities/SineEnemy.ts";
import type {EnemiesData, SineEnemyData} from "../gameData/EnemiesData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import Player from "../entities/Player.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    private static readonly BULLET_POOL_MAX_SIZE: number = 256;
    private static readonly PLAYER_BULLET_POOL_SIZE: number = 64;
    private static readonly ENEMY_BULLET_POOL_SIZE: number = 256;
    private static readonly PLAYER_DISTANCE_FROM_BOTTOM: number = 128;
    private static readonly ENEMY_SPAWN_DELAY: number = 1500;
    private static readonly ENEMY_MAX_ACTIVE: number = 5;
    private static readonly ENEMY_SPAWN_MARGIN: number = 64;
    private static readonly BOSS_DEATH_DURATION: number = 500;
    private static readonly CAMERA_SHAKE_DURATION: number = 100;
    private static readonly BULLET_HIT_SHAKE_INTENSITY: number = 0.01;
    private static readonly CONTACT_SHAKE_INTENSITY: number = 0.03;

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: EntityManager.BULLET_POOL_MAX_SIZE,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    }

    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    private _enemies: Physics.Arcade.Group;
    private _sineEnemies: Physics.Arcade.Group;
    private _bosses: Physics.Arcade.Group;
    private _bossesData: BossesData;
    private _currentBoss: Boss | undefined;
    private _bossCount: number = 0;
    private _nextBossScore: number = 0;
    private _enemyBullets: Physics.Arcade.Group;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        const camera = this.scene!.cameras.main;

        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(EntityManager.PLAYER_BULLET_POOL_SIZE, this._playerBullets);

        this._player = new Player(this.scene!, camera.centerX, camera.height - EntityManager.PLAYER_DISTANCE_FROM_BOTTOM);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(EntityManager.ENEMY_BULLET_POOL_SIZE, this._enemyBullets);

        const ufoData = (this.scene!.cache.json.get(GameConstants.DataKeys.ENEMIES) as EnemiesData).ufoEnemy;
        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: GameConstants.ATLAS_KEY,
            defaultFrame: Enemy.IDLE_FRAME,
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets, ufoData);
            }
        });

        // Spawn enemies indefinitely
        this.scene!.time.addEvent({
            delay: EntityManager.ENEMY_SPAWN_DELAY,
            callback: () => this.spawnEnemy(this._enemies, EntityManager.ENEMY_MAX_ACTIVE, EntityManager.ENEMY_SPAWN_MARGIN),
            loop: true
        });

        this.initSineEnemies();
        this.initBosses();

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    public initGroupCollisions() {
        this.initEnemyGroupCollisions(this._enemies);
        this.initEnemyGroupCollisions(this._sineEnemies);
        // Bosses stay at the top of the screen: only bullets can reach them
        this.initEnemyBulletCollisions(this._bosses);
        this.initPlayerBulletCollisions();

        console.log("[EntityManager] Group collisions initialized");
    }

    private initSineEnemies() {
        const data: SineEnemyData = (this.scene!.cache.json.get(GameConstants.DataKeys.ENEMIES) as EnemiesData).sineEnemy;

        this._sineEnemies = this.scene!.physics.add.group({
            classType: SineEnemy,
            defaultKey: GameConstants.ATLAS_KEY,
            defaultFrame: data.texture,
            createCallback: (enemy) => {
                (enemy as SineEnemy).init(this._enemyBullets, data);
            }
        });

        // Keep the whole sine wave on screen
        const spawnMargin: number = data.movement.amplitude + EntityManager.ENEMY_SPAWN_MARGIN;
        this.scene!.time.addEvent({
            delay: data.spawn.delay,
            callback: () => this.spawnEnemy(this._sineEnemies, data.spawn.maxActive, spawnMargin),
            loop: true
        });
    }

    private initBosses() {
        this._bossesData = this.scene!.cache.json.get(GameConstants.DataKeys.BOSSES) as BossesData;
        this._bosses = this.scene!.physics.add.group();

        // Scene plugins survive a scene restart: reset the boss progression
        this._currentBoss = undefined;
        this._bossCount = 0;
        this._nextBossScore = this._bossesData.scoreInterval;

        this._player.getComponent(ChargeLaser)?.on(ChargeLaser.FIRE_EVENT, this.onLaserFired, this);

        // The registry is global: stop listening when the scene shuts down
        const registryEvents = this.scene!.registry.events;
        registryEvents.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        this.scene!.events.once(Scenes.Events.SHUTDOWN, () => {
            registryEvents.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        });
    }

    private onScoreChanged(_parent: unknown, score: number) {
        if (!this._currentBoss && score >= this._nextBossScore)
            this.spawnBoss();
    }

    private spawnBoss() {
        const bossData = this.getNextBossData();
        const boss = this.createBoss(bossData);
        this._currentBoss = boss;

        boss.once(Boss.FINISHER_READY_EVENT, () => this.onBossFinisherReady(boss));
        boss.getComponent(Health)?.once(Health.DEATH_EVENT, () => this.onBossKilled(boss));

        this.game!.events.emit(GameConstants.Events.BOSS_SPAWNED_EVENT, boss);

        console.log("[EntityManager] Boss spawned: " + bossData.name);
    }

    // Infinite run: the bosses loop, in the order of the JSON file
    private getNextBossData(): BossData {
        const bosses = this._bossesData.bosses;
        return bosses[this._bossCount % bosses.length];
    }

    // Infinite run: a boss gets more health each time all the bosses have been beaten
    private getBossHealth(bossData: BossData): number {
        const cycle: number = Math.floor(this._bossCount / this._bossesData.bosses.length);
        return Math.round(bossData.health * (1 + this._bossesData.healthGrowthPerCycle * cycle));
    }

    private createBoss(bossData: BossData): Boss {
        const boss = new Boss(this.scene!, 0, 0, GameConstants.ATLAS_KEY, bossData.texture);
        boss.init({
            bulletsGroup: this._enemyBullets,
            data: bossData,
            health: this.getBossHealth(bossData),
            finisherThreshold: this._bossesData.finisher.healthThreshold,
            target: this._player
        });
        this._bosses.add(boss);
        boss.enable(this.scene!.cameras.main.centerX, 0);

        return boss;
    }

    private onBossFinisherReady(boss: Boss) {
        this._player.getComponent(ChargeLaser)?.arm();
        this.game!.events.emit(GameConstants.Events.BOSS_FINISHER_READY_EVENT, boss);
    }

    private onBossKilled(boss: Boss) {
        this._currentBoss = undefined;
        this._bossCount++;
        this._nextBossScore = Number(this.scene!.registry.get(RegistryConstants.Keys.PLAYER_SCORE)) + this._bossesData.scoreInterval;

        this._player.getComponent(ChargeLaser)?.disarm();
        this.game!.events.emit(GameConstants.Events.BOSS_KILLED_EVENT, boss);

        console.log("[EntityManager] Boss killed: " + boss.bossName);

        // Bosses are not pooled: destroy it once its death feedback is over
        this.scene!.time.delayedCall(EntityManager.BOSS_DEATH_DURATION, () => boss.destroy());
    }

    private onLaserFired(beam: Geom.Line) {
        const boss = this._currentBoss;
        if (!boss || !boss.isFinisherReady)
            return;

        // The beam is a thick line: grow the boss hit circle by half of its width
        const beamWidth: number = this._player.getComponent(ChargeLaser)?.beamWidth ?? 0;
        const hitCircle = new Geom.Circle(boss.x, boss.y, boss.arcadeBody.halfWidth + beamWidth / 2);
        if (Geom.Intersects.LineToCircle(beam, hitCircle))
            boss.finish();
    }

    private initPlayerBulletCollisions() {
        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.shakeCamera(EntityManager.BULLET_HIT_SHAKE_INTENSITY);
        });
    }

    private initEnemyGroupCollisions(enemies: Physics.Arcade.Group) {
        this.initEnemyBulletCollisions(enemies);

        this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as BaseEnemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(this.contactDamage);

            this.shakeCamera(EntityManager.CONTACT_SHAKE_INTENSITY);
        });
    }

    private initEnemyBulletCollisions(enemies: Physics.Arcade.Group) {
        this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
            const health = (enemy as BaseEnemy).getComponent(Health);
            // No points while the enemy can't be hurt (boss waiting for the finisher)
            if (health?.enabled)
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            health?.damage((bullet as Bullet).damage);
        });
    }

    private get contactDamage(): number {
        return (this.scene!.cache.json.get(GameConstants.DataKeys.PLAYER) as PlayerData).contactDamage;
    }

    private shakeCamera(intensity: number) {
        this.scene?.cameras.main.shake(EntityManager.CAMERA_SHAKE_DURATION, intensity);
    }

    private spawnEnemy(enemies: Physics.Arcade.Group, maxActive: number, margin: number) {
        // No regular enemies during a boss fight
        if (this._currentBoss || enemies.countActive(true) >= maxActive)
            return;

        const enemy = enemies.get() as BaseEnemy | null;
        if (!enemy)
            return;

        enemy.enable(this.pickSpawnX(margin), 0);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned");
    }

    // If the margin is too large for the screen, spawn in the middle
    private pickSpawnX(margin: number): number {
        const camera = this.scene!.cameras.main;
        if (margin * 2 >= camera.width)
            return camera.centerX;

        return Phaser.Math.Between(margin, camera.width - margin);
    }
}
