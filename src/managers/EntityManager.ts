import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import PowerUpSlot from "../components/PowerUpSlot.ts";
import Shockwave from "../effects/Shockwave.ts";
import Bullet from "../entities/Bullet.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Enemy from "../entities/Enemy.ts";
import SineEnemy from "../entities/SineEnemy.ts";
import type {EnemiesData, SineEnemyData} from "../gameData/EnemiesData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import type {PowerUpEffects} from "../gameData/PowerUpsData.ts";
import Player from "../entities/Player.ts";
import BossDirector from "./BossDirector.ts";
import PowerUpSpawner from "./PowerUpSpawner.ts";
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
    private static readonly CAMERA_SHAKE_DURATION: number = 100;
    private static readonly BULLET_HIT_SHAKE_INTENSITY: number = 0.01;
    private static readonly CONTACT_SHAKE_INTENSITY: number = 0.03;
    private static readonly RAM_SHAKE_DURATION: number = 80;
    private static readonly RAM_SHAKE_INTENSITY: number = 0.01;

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
    private _bossDirector: BossDirector;
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
        this.initBossDirector();
        new PowerUpSpawner(this.scene!, this._player);

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    public initGroupCollisions() {
        this.initEnemyGroupCollisions(this._enemies);
        this.initEnemyGroupCollisions(this._sineEnemies);
        // Bosses stay at the top of the screen: only bullets can reach them
        this.initEnemyBulletCollisions(this._bossDirector.bosses, bullet => bullet.bossDamage);
        this.initPlayerBulletCollisions();
        this.initShockwaves();

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

    // A new game gets a new BossDirector (the plugin itself survives the restart of the scene)
    private initBossDirector() {
        this._bossDirector = new BossDirector(this.scene!, this._player, this._enemyBullets);
    }

    private initPlayerBulletCollisions() {
        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.shakeCamera(EntityManager.BULLET_HIT_SHAKE_INTENSITY);
        });
    }

    // Power-up level that releases a shockwave, which sweeps the enemies, the enemy bullets and hurts the bosses
    private initShockwaves() {
        this._player.getComponent(PowerUpSlot)?.on(PowerUpSlot.START_EVENT, (effects: PowerUpEffects) => {
            if (!effects.shockwave)
                return;

            new Shockwave(this.scene!, {
                x: this._player.x,
                y: this._player.y,
                data: effects.shockwave,
                targets: {
                    enemies: [this._enemies, this._sineEnemies],
                    bullets: this._enemyBullets,
                    bosses: this._bossDirector.bosses
                }
            });
        });
    }

    private initEnemyGroupCollisions(enemies: Physics.Arcade.Group) {
        this.initEnemyBulletCollisions(enemies, bullet => bullet.damage);

        this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as BaseEnemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            // Ramming (power-up) destroys the enemy without any damage to the player
            if ((player as Player).getComponent(PowerUpSlot)?.effects?.ram) {
                this.shakeCamera(EntityManager.RAM_SHAKE_INTENSITY, EntityManager.RAM_SHAKE_DURATION);
                return;
            }

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(this.contactDamage);

            this.shakeCamera(EntityManager.CONTACT_SHAKE_INTENSITY);
        });
    }

    // "getDamage" tells how much damage a bullet deals to this kind of enemy
    private initEnemyBulletCollisions(enemies: Physics.Arcade.Group, getDamage: (bullet: Bullet) => number) {
        this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
            // A bullet that goes through only hits each enemy once
            if (!(bullet as Bullet).registerHit(enemy as BaseEnemy))
                return;

            const health = (enemy as BaseEnemy).getComponent(Health);
            // No points while the enemy can't be hurt (boss waiting for the finisher)
            if (health?.enabled)
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            health?.damage(getDamage(bullet as Bullet));
        });
    }

    private get contactDamage(): number {
        return (this.scene!.cache.json.get(GameConstants.DataKeys.PLAYER) as PlayerData).contactDamage;
    }

    private shakeCamera(intensity: number, duration: number = EntityManager.CAMERA_SHAKE_DURATION) {
        this.scene?.cameras.main.shake(duration, intensity);
    }

    private spawnEnemy(enemies: Physics.Arcade.Group, maxActive: number, margin: number) {
        // No regular enemies during a boss fight
        if (this._bossDirector.isBossFightActive || enemies.countActive(true) >= maxActive)
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
