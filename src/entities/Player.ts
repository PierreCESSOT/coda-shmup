import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import {BossesData} from "../gameData/BossesData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";
import RegistryConstants from "../RegistryConstants.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    private static readonly DEFAULT_SHIP_ID: number = 1;
    private static readonly DEFAULT_RATE_OF_FIRE: number = 0.5;
    private static readonly DEFAULT_SHOOT_SOUND: string = GameConstants.AudioKeys.PLAYER_SHOOT;
    private static readonly FACING_UP_ANGLE: number = -90;
    private static readonly HIT_INVULNERABILITY_DURATION: number = 50;

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
    private _startingHealth: number;
    private _rateOfFire: number;
    private _shootSound: string;
    private _lastShotTime: number;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, GameConstants.ATLAS_KEY);

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();
            this._chargeLaserKey = this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.F);

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        // Ship chosen in the home menu: its health is fixed for the whole game
        const shipId: number = this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_ID) ?? Player.DEFAULT_SHIP_ID;
        this._startingHealth = this.getShipsData()[shipId].health;

        this.addComponent(new Health(this._startingHealth, this));
        this.addComponent(new Movement());
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));
        this.initChargeLaser();

        this.angle = Player.FACING_UP_ANGLE;
        this.selectPlayerShip(shipId);

        this._rateOfFire = Player.DEFAULT_RATE_OF_FIRE;
        this._shootSound = Player.DEFAULT_SHOOT_SOUND;
        this._lastShotTime = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, this.disableCollisionsBriefly, this);
    }

    public selectPlayerShip(playerShipDataId: number) {
        this._playerShipData = this.getShipsData()[playerShipDataId];

        const shipColors = this.scene.cache.json.get(GameConstants.DataKeys.SHIP_COLORS) as ShipColorData[];
        const colorIndex: number = this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_COLOR) ?? 0;
        ShipAppearance.apply(this, this._playerShipData, shipColors[colorIndex] ?? shipColors[0]);
        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.refreshStats();
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        this.handleMovementInput(deltaTime);
        // Stop player from going offscreen
        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, this.scene.cameras.main.width - this.displayWidth / 2);

        // Hold F to charge the finisher laser
        this.getComponent(ChargeLaser)?.update(this, this.active && (this._chargeLaserKey?.isDown ?? false), deltaTime);

        this.handleShootInput(timeSinceLaunch);
    }

    private getShipsData(): PlayerShipsData {
        return this.scene.cache.json.get(GameConstants.DataKeys.PLAYER_SHIPS) as PlayerShipsData;
    }

    // Disabled until a boss can be finished
    private initChargeLaser() {
        const bossesData = this.scene.cache.json.get(GameConstants.DataKeys.BOSSES) as BossesData;
        this.addComponent(new ChargeLaser(this, bossesData.finisher));
    }

    private disableCollisionsBriefly() {
        this.arcadeBody.setEnable(false);

        this.scene.time.delayedCall(Player.HIT_INVULNERABILITY_DURATION, () => {
            // A dead player stays disabled
            if (this.active)
                this.arcadeBody.setEnable(true);
        });
    }

    private refreshStats() {
        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed);
        this.getComponent(Weapon)?.setDamageMultiplier(this._playerShipData.damage);
    }

    // Left and right arrow keys move the player smoothly using deltaTime, or rotate it while Shift is held
    private handleMovementInput(deltaTime: number) {
        const direction: number = this.getHorizontalInputDirection();
        if (direction === 0)
            return;

        if (this._cursorKeys.shift.isDown)
            this.angle += direction * this._playerShipData.movementSpeed * deltaTime;
        else
            this.getComponent(Movement)?.moveHorizontally(this, direction * deltaTime);
    }

    // -1 for left, 1 for right, 0 when idle (left wins if both keys are down)
    private getHorizontalInputDirection(): number {
        if (this._cursorKeys.left.isDown)
            return -1;

        if (this._cursorKeys.right.isDown)
            return 1;

        return 0;
    }

    // Press space to shoot
    private handleShootInput(timeSinceLaunch: number) {
        if (!this._cursorKeys.space.isDown || !this.isWeaponReady(timeSinceLaunch))
            return;

        this.getComponent(Weapon)?.shoot(this);
        this.scene.sound.play(this._shootSound);

        this._lastShotTime = timeSinceLaunch;
    }

    private isWeaponReady(timeSinceLaunch: number): boolean {
        return timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000;
    }
}
