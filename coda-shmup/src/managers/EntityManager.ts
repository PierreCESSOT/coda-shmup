import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import PowerUpSlot from "../components/PowerUpSlot.ts";
import Shockwave from "../effects/Shockwave.ts";
import Bullet from "../entities/Bullet.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Boss from "../entities/Boss.ts";
import Enemy from "../entities/Enemy.ts";
import SineEnemy from "../entities/SineEnemy.ts";
import Player from "../entities/Player.ts";
import type {BossSummonData} from "../gameData/BossesData.ts";
import type {EnemiesData, SineEnemyData} from "../gameData/EnemiesData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import type {PowerUpEffects} from "../gameData/PowerUpsData.ts";
import BossDirector from "./BossDirector.ts";
import PowerUpSpawner from "./PowerUpSpawner.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

/**
 * Crée et relie toutes les entités de la partie :
 *  - le joueur et ses balles
 *  - les ennemis (UFO rouges, ennemis sinusoïdaux) et leurs balles
 *  - les boss, via le BossDirector
 *  - les bonus qui tombent, via le PowerUpSpawner
 *  - les collisions entre tout ça, et l'onde de choc du bonus SUPER DAMAGE III
 */
export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // UFO rouges : un toutes les 1,5 s, 5 maximum à l'écran
    private static readonly UFO_SPAWN_DELAY: number = 1500;
    private static readonly UFO_MAX_ACTIVE: number = 5;
    private static readonly SPAWN_MARGIN: number = 64;          // Distance minimum aux bords de l'écran
    private static readonly SUMMON_SPACING: number = 160;       // Écart entre deux ennemis invoqués

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
    private _bossDirector: BossDirector;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    // ---------- Joueur ----------

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, this.scene!.cameras.main.centerX, this.scene!.cameras.main.height - 128);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    // ---------- Ennemis ----------

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        this.initUfoEnemies();
        this.initSineEnemies();

        // Nouvelle partie = nouveau BossDirector (le plugin, lui, survit au restart de la scène)
        this._bossDirector = new BossDirector(this.scene!, this._player, this._enemyBullets,
            (boss, summon) => this.summonEnemies(boss, summon));
        new PowerUpSpawner(this.scene!, this._player);

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    private initUfoEnemies() {
        const data = (this.scene!.cache.json.get('enemies') as EnemiesData).ufoEnemy;

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets, data);
            }
        });

        this.scene!.time.addEvent({
            delay: EntityManager.UFO_SPAWN_DELAY,
            callback: () => this.spawnEnemy(this._enemies, EntityManager.UFO_MAX_ACTIVE, EntityManager.SPAWN_MARGIN),
            loop: true
        });
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

        // Marge plus grande pour que toute la vague reste dans l'écran
        const spawnMargin: number = data.movement.amplitude + EntityManager.SPAWN_MARGIN;
        this.scene!.time.addEvent({
            delay: data.spawn.delay,
            callback: () => this.spawnEnemy(this._sineEnemies, data.spawn.maxActive, spawnMargin),
            loop: true
        });
    }

    // Spawn normal, en haut de l'écran à une position au hasard
    private spawnEnemy(enemies: Physics.Arcade.Group, maxActive: number, margin: number) {
        // Pas d'ennemis normaux pendant un combat de boss
        if (this._bossDirector.isBossFightActive || enemies.countActive(true) >= maxActive)
            return;

        // Si la marge est trop grande pour l'écran, on spawn au milieu
        const camera = this.scene!.cameras.main;
        const x: number = margin * 2 < camera.width ? Phaser.Math.Between(margin, camera.width - margin) : camera.centerX;
        this.spawnEnemyAt(enemies, x, 0);
    }

    // Renforts d'un boss ultra : répartis de chaque côté du boss
    private summonEnemies(boss: Boss, summon: BossSummonData) {
        const enemies: Physics.Arcade.Group = summon.enemy === 'ufo' ? this._enemies : this._sineEnemies;
        const camera = this.scene!.cameras.main;

        for (let i: number = 0; i < summon.count; i++) {
            const offsetX: number = (i - (summon.count - 1) / 2) * EntityManager.SUMMON_SPACING;
            const x: number = Phaser.Math.Clamp(boss.x + offsetX, EntityManager.SPAWN_MARGIN, camera.width - EntityManager.SPAWN_MARGIN);
            this.spawnEnemyAt(enemies, x, boss.y + boss.displayHeight / 2);
        }
    }

    private spawnEnemyAt(enemies: Physics.Arcade.Group, x: number, y: number) {
        const enemy = enemies.get() as BaseEnemy;
        if (!enemy)
            return;

        enemy.enable(x, y);
        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);
        console.log("[EntityManager] Enemy spawned");
    }

    // ---------- Collisions ----------

    public initGroupCollisions() {
        // Ennemis normaux : touchés par les balles, et par le vaisseau lui-même
        this.initPlayerBulletsCollisions(this._enemies, false);
        this.initPlayerBulletsCollisions(this._sineEnemies, false);
        this.initPlayerContactCollisions(this._enemies);
        this.initPlayerContactCollisions(this._sineEnemies);

        // Boss : ils restent en haut de l'écran, seules les balles les atteignent
        this.initPlayerBulletsCollisions(this._bossDirector.bosses, true);

        // Balles ennemies sur le joueur
        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        // Bonus au niveau qui lâche une onde de choc
        this._player.getComponent(PowerUpSlot)?.on(PowerUpSlot.START_EVENT, (effects: PowerUpEffects) => {
            if (effects.shockwave)
                new Shockwave(this.scene!, this._player.x, this._player.y, effects.shockwave, {
                    enemies: [this._enemies, this._sineEnemies],
                    bullets: this._enemyBullets,
                    bosses: this._bossDirector.bosses
                });
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private initPlayerBulletsCollisions(enemies: Physics.Arcade.Group, areBosses: boolean) {
        this.scene!.physics.add.overlap(this._playerBullets, enemies, (bullet, enemy) => {
            // Une balle qui traverse ne touche chaque ennemi qu'une fois
            if (!(bullet as Bullet).registerHit(enemy as BaseEnemy))
                return;

            const enemyHealth = (enemy as BaseEnemy).getComponent(Health);

            // Pas de points quand l'ennemi est invulnérable (boss qui attend le laser chargé)
            if (enemyHealth?.enabled)
                this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const damage: number = areBosses ? (bullet as Bullet).bossDamage : (bullet as Bullet).damage;
            enemyHealth?.damage(damage);
        });
    }

    // Collision vaisseau / ennemi : l'ennemi meurt, le joueur perd des PV (sauf s'il fonce avec le bonus "ram")
    private initPlayerContactCollisions(enemies: Physics.Arcade.Group) {
        const contactDamage: number = (this.scene!.cache.json.get('player') as PlayerData).contactDamage;

        this.scene!.physics.add.overlap(this._player, enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as BaseEnemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const isRamming: boolean = (player as Player).getComponent(PowerUpSlot)?.effects?.ram ?? false;
            if (isRamming) {
                this.scene?.cameras.main.shake(80, 0.01);
                return;
            }

            (player as Player).getComponent(Health)?.damage(contactDamage);
            this.scene?.cameras.main.shake(100, 0.03);
        });
    }
}
