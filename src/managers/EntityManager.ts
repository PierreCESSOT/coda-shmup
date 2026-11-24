import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
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

    public initGroupCollisions() {
        this.initEnemyGroupCollisions(this._enemies);
        this.initEnemyGroupCollisions(this._sineEnemies);

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private initEnemyGroupCollisions(enemies: Physics.Arcade.Group) {
        this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (enemy as BaseEnemy).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as BaseEnemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });
    }

    private spawnEnemy(enemies: Physics.Arcade.Group, maxActive: number, margin: number) {
        if (enemies.countActive(true) >= maxActive) {
            return;
        }

        const enemy = enemies.get() as BaseEnemy;
        if (!enemy) {
            return;
        }

        // If the margin is too large for the screen, spawn in the middle
        const camera = this.scene!.cameras.main;
        const x: number = margin * 2 < camera.width ? Phaser.Math.Between(margin, camera.width - margin) : camera.centerX;
        enemy.enable(x, 0);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned");
    }
}