import {Display, Input, Scene, Scenes} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import {StreakData} from "../gameData/StreakData.ts";
import {PlayerData} from "../gameData/PlayerData.ts";
import {BossesData} from "../gameData/BossesData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import KillStreak from "../components/KillStreak.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";
import RegistryConstants from "../RegistryConstants.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    private static readonly DEFAULT_RATE_OF_FIRE: number = 0.5;
    private static readonly DEFAULT_SHOOT_SOUND: string = 'sfx_laser1';

    private readonly _bulletData: BulletData = {
        width: 12,
        height: 4,
        color: 0xffe066,
        speed: 1024,
        damage: 1
    };

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private _chargeLaserKey: Phaser.Input.Keyboard.Key;
    private _playerShipData: PlayerShipData;
    private _rateOfFire: number;
    private _shootSound: string;
    private _streakData: StreakData;
    private _playerData: PlayerData;
    private _lastShotTime: number;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();
            this._chargeLaserKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.F);

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this._playerData = this.scene.cache.json.get('player') as PlayerData;
        this.addComponent(new Health(this._playerData.health, this));
        this.addComponent(new Movement());
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        // Disabled until a boss can be finished
        const bossesData = this.scene.cache.json.get('bosses') as BossesData;
        this.addComponent(new ChargeLaser(this, bossesData.finisher));

        this._streakData = this.scene.cache.json.get('streak') as StreakData;
        const killStreak = new KillStreak(this._streakData.killsRequired);
        killStreak.on(KillStreak.START_EVENT, this.onStreakStarted, this);
        killStreak.on(KillStreak.END_EVENT, this.onStreakEnded, this);
        this.addComponent(killStreak);

        // Game events outlive the scene: stop listening when it shuts down (e.g. on restart)
        const gameEvents = this.scene.game.events;
        gameEvents.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        this.scene.events.once(Scenes.Events.SHUTDOWN, () => {
            gameEvents.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        });

        this.angle = -90;

        // Ship chosen in the home menu
        this.selectPlayerShip(this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_ID) ?? 1);

        this._rateOfFire = Player.DEFAULT_RATE_OF_FIRE;
        this._shootSound = Player.DEFAULT_SHOOT_SOUND;
        this._lastShotTime = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, (current: number, previous: number) => {
            // Healing is not a hit
            if (current >= previous)
                return;

            this.getComponent(KillStreak)?.reset();

            this.arcadeBody.setEnable(false);

            this.scene.time.delayedCall(50, () => {
                // A dead player stays disabled
                if (this.active)
                    this.arcadeBody.setEnable(true);
            });
        });
    }

    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        const shipColors = this.scene.cache.json.get('shipColors') as ShipColorData[];
        const colorIndex: number = this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_COLOR) ?? 0;
        ShipAppearance.apply(this, this._playerShipData, shipColors[colorIndex] ?? shipColors[0]);
        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed);
    }

    private onEnemyKilled() {
        this.getComponent(KillStreak)?.addKill();
    }

    private onStreakStarted() {
        const healData = this._playerData.heal.streak;
        this.getComponent(Health)?.healRandomPercent(healData.min, healData.max);

        const laserData = this._streakData.laser;
        this.getComponent(Weapon)?.setBulletData(toBulletData(laserData.bullet));
        this._rateOfFire = laserData.fireRate;
        this._shootSound = laserData.sound;

        // Glow only exists with the WebGL renderer
        this.preFX?.addGlow(Display.Color.HexStringToColor(laserData.glowColor).color, 6);
    }

    private onStreakEnded() {
        this.getComponent(Weapon)?.setBulletData(this._bulletData);
        this._rateOfFire = Player.DEFAULT_RATE_OF_FIRE;
        this._shootSound = Player.DEFAULT_SHOOT_SOUND;

        this.preFX?.clear();
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // Press left or right arrow keys to move the player smoothly horizontally using deltaTime
        if (this._cursorKeys.left.isDown) {
            if (this._cursorKeys.shift.isDown) {
                this.angle -= this._playerShipData.movementSpeed * deltaTime;
            } else {
                this.getComponent(Movement)?.moveHorizontally(this, -deltaTime);
            }
        } else if (this._cursorKeys.right.isDown) {
            if (this._cursorKeys.shift.isDown) {
                this.angle += this._playerShipData.movementSpeed * deltaTime;
            } else {
                this.getComponent(Movement)?.moveHorizontally(this, deltaTime);
            }
        }
        // Stop player from going offscreen
        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, this.scene.cameras.main.width - this.displayWidth / 2);

        // Hold F to charge the finisher laser
        this.getComponent(ChargeLaser)?.update(this, this.active && (this._chargeLaserKey?.isDown ?? false), deltaTime);

        // Press space to shoot
        if (this._cursorKeys.space.isDown) {
            if (timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000) {
                this.getComponent(Weapon)?.shoot(this);
                this.scene.sound.play(this._shootSound);

                this._lastShotTime = timeSinceLaunch;
            }
        }
    }
}