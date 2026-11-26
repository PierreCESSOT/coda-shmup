import {GameObjects, Geom, Plugins, Physics, Scene, Scenes} from "phaser";
import Health from "../components/Health.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Boss from "../entities/Boss.ts";
import type {BossData, BossesData, BossSummonData} from "../gameData/BossesData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import Bullet from "../entities/Bullet.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Enemy from "../entities/Enemy.ts";
import SineEnemy from "../entities/SineEnemy.ts";
import type {EnemiesData, SineEnemyData} from "../gameData/EnemiesData.ts";
import Player from "../entities/Player.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 256,
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
    private _regularBossCount: number = 0;
    private _ultraBossCount: number = 0;
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
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, this.scene!.cameras.main.centerX, this.scene!.cameras.main.height - 128);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets);
            }
        });

        // Spawn enemies indefinitely
        this.scene!.time.addEvent({
            delay: 1500,
            callback: () => this.spawnEnemy(this._enemies, 5, 64),
            loop: true
        });

        this.initSineEnemies();
        this.initBosses();

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    private initSineEnemies() {
        const data: SineEnemyData = (this.scene!.cache.json.get('enemies') as EnemiesData).sineEnemy;

        this._sineEnemies = this.scene!.physics.add.group({
            classType: SineEnemy,
            defaultKey: 'sprites',
            defaultFrame: data.texture,
            createCallback: (enemy) => {
                (enemy as SineEnemy).init(this._enemyBullets, data);
            }
        });

        // Keep the whole sine wave on screen
        const spawnMargin: number = data.movement.amplitude + 64;
        this.scene!.time.addEvent({
            delay: data.spawn.delay,
            callback: () => this.spawnEnemy(this._sineEnemies, data.spawn.maxActive, spawnMargin),
            loop: true
        });
    }

    private initBosses() {
        this._bossesData = this.scene!.cache.json.get('bosses') as BossesData;
        this._bosses = this.scene!.physics.add.group();

        // Scene plugins survive a scene restart: reset the boss progression
        this._currentBoss = undefined;
        this._bossCount = 0;
        this._regularBossCount = 0;
        this._ultraBossCount = 0;
        this._nextBossScore = this._bossesData.scoreInterval;

        this._player.getComponent(ChargeLaser)?.on(ChargeLaser.FIRE_EVENT, this.onLaserFired, this);

        // The registry is global: stop listening when the scene shuts down
        const registryEvents = this.scene!.registry.events;
        registryEvents.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        this.scene!.events.once(Scenes.Events.SHUTDOWN, () => {
            registryEvents.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        });
    }

    private onScoreChanged(_parent: any, score: number) {
        if (!this._currentBoss && score >= this._nextBossScore)
            this.spawnBoss();
    }

    private spawnBoss() {
        const bossesData: BossesData = this._bossesData;

        // Every Nth boss is an ultra boss, each list loops on its own
        const isUltra: boolean = (this._bossCount + 1) % bossesData.ultraEvery === 0;
        const bossData: BossData = isUltra
            ? bossesData.ultraBosses[this._ultraBossCount++ % bossesData.ultraBosses.length]
            : bossesData.bosses[this._regularBossCount++ % bossesData.bosses.length];

        // Infinite run: more health each time a full cycle (ending with an ultra boss) is over
        const cycle: number = Math.floor(this._bossCount / bossesData.ultraEvery);
        const health: number = Math.round(bossData.health * (1 + bossesData.healthGrowthPerCycle * cycle));

        const boss = new Boss(this.scene!, 0, 0, 'sprites', bossData.texture);
        boss.init(this._enemyBullets, bossData, health, bossesData.finisher.healthThreshold, this._player, isUltra);
        this._bosses.add(boss);
        boss.enable(this.scene!.cameras.main.centerX, 0);
        this._currentBoss = boss;

        boss.once(Boss.FINISHER_READY_EVENT, () => {
            this._player.getComponent(ChargeLaser)?.arm();
            this.game!.events.emit(GameConstants.Events.BOSS_FINISHER_READY_EVENT, boss);
        });
        boss.on(Boss.SUMMON_EVENT, this.onBossSummon, this);
        boss.getComponent(Health)?.once(Health.DEATH_EVENT, () => this.onBossKilled(boss));

        this.game!.events.emit(GameConstants.Events.BOSS_SPAWNED_EVENT, boss);

        console.log("[EntityManager] Boss spawned: " + bossData.name);
    }

    private onBossKilled(boss: Boss) {
        this._currentBoss = undefined;
        this._bossCount++;
        this._nextBossScore = Number(this.scene!.registry.get(RegistryConstants.Keys.PLAYER_SCORE)) + this._bossesData.scoreInterval;

        this._player.getComponent(ChargeLaser)?.disarm();
        this.game!.events.emit(GameConstants.Events.BOSS_KILLED_EVENT, boss);

        console.log("[EntityManager] Boss killed: " + boss.bossName);

        // Bosses are not pooled: destroy it once its death feedback is over
        this.scene!.time.delayedCall(500, () => boss.destroy());
    }

    private onBossSummon(boss: Boss, summon: BossSummonData) {
        const enemies: Physics.Arcade.Group = summon.enemy === 'ufo' ? this._enemies : this._sineEnemies;
        const camera = this.scene!.cameras.main;

        // Spread the summoned enemies on both sides of the boss
        const spacing: number = 160;
        for (let i: number = 0; i < summon.count; i++) {
            const offsetX: number = (i - (summon.count - 1) / 2) * spacing;
            const x: number = Phaser.Math.Clamp(boss.x + offsetX, 64, camera.width - 64);
            this.spawnEnemyAt(enemies, x, boss.y + boss.displayHeight / 2);
        }
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

    public initGroupCollisions() {
        this.initEnemyGroupCollisions(this._enemies);
        this.initEnemyGroupCollisions(this._sineEnemies);
        // Bosses stay at the top of the screen: only bullets can reach them
        this.initEnemyBulletCollisions(this._bosses, true);

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private initEnemyGroupCollisions(enemies: Physics.Arcade.Group) {
        this.initEnemyBulletCollisions(enemies);

        this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as BaseEnemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage((this.scene!.cache.json.get('player') as PlayerData).contactDamage);

            this.scene?.cameras.main.shake(100, 0.03);
        });
    }

    private initEnemyBulletCollisions(enemies: Physics.Arcade.Group, areBosses: boolean = false) {
        this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
            const health = (enemy as BaseEnemy).getComponent(Health);
            // No points while the enemy can't be hurt (boss waiting for the finisher)
            if (health?.enabled)
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            health?.damage(areBosses ? (bullet as Bullet).bossDamage : (bullet as Bullet).damage);
        });
    }

    private spawnEnemy(enemies: Physics.Arcade.Group, maxActive: number, margin: number) {
        // No regular enemies during a boss fight
        if (this._currentBoss || enemies.countActive(true) >= maxActive) {
            return;
        }

        const enemy = enemies.get() as BaseEnemy;
        if (!enemy) {
            return;
        }

        // If the margin is too large for the screen, spawn in the middle
        const camera = this.scene!.cameras.main;
        const x: number = margin * 2 < camera.width ? Phaser.Math.Between(margin, camera.width - margin) : camera.centerX;
        this.enableEnemy(enemy, x, 0);
    }

    // Spawns an enemy at a given position, even during a boss fight
    private spawnEnemyAt(enemies: Physics.Arcade.Group, x: number, y: number) {
        const enemy = enemies.get() as BaseEnemy;
        if (enemy)
            this.enableEnemy(enemy, x, y);
    }

    private enableEnemy(enemy: BaseEnemy, x: number, y: number) {
        enemy.enable(x, y);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned");
    }
}