import {Display, Input, Scene, Scenes} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import {PlayerData} from "../gameData/PlayerData.ts";
import type {RangeData} from "../gameData/RangeData.ts";
import type {PowerUpEffects} from "../gameData/PowerUpsData.ts";
import type {SpreadData} from "../gameData/SpreadShotData.ts";
import {BossesData} from "../gameData/BossesData.ts";
import Entity from './Entity.ts';
import BaseEnemy from './BaseEnemy.ts';
import Boss from './Boss.ts';
import Health from "../components/Health.ts";
import PowerUpSlot from "../components/PowerUpSlot.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Movement from "../components/Movement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";
import RegistryConstants from "../RegistryConstants.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    private static readonly DEFAULT_SHIP_ID: number = 1;
    private static readonly DEFAULT_RATE_OF_FIRE: number = 0.5;
    private static readonly DEFAULT_SHOOT_SOUND: string = GameConstants.AudioKeys.PLAYER_SHOOT;
    private static readonly FACING_UP_ANGLE: number = -90;
    private static readonly HIT_INVULNERABILITY_DURATION: number = 50;
    private static readonly SINGLE_SHOT: SpreadData = {count: 1, angle: 0};
    private static readonly POWER_UP_GLOW_BASE: number = 3;
    private static readonly POWER_UP_GLOW_PER_LEVEL: number = 3;

    private readonly _bulletData: BulletData = {
        width: 12,
        height: 4,
        color: 0xffe066,
        speed: 1024,
        damage: 1
    };

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private _chargeLaserKey: Phaser.Input.Keyboard.Key;
    private _playerData: PlayerData;
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
        this._playerData = this.scene.cache.json.get(GameConstants.DataKeys.PLAYER) as PlayerData;

        // Ship chosen in the home menu: its health is fixed for the whole game
        const shipId: number = this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_ID) ?? Player.DEFAULT_SHIP_ID;
        this._startingHealth = this.getShipsData()[shipId].health;

        this.initHealth();
        this.addComponent(new Movement());
        this.addComponent(new SpreadWeapon(bulletsGroup, this._bulletData, Player.SINGLE_SHOT));
        this.initChargeLaser();
        this.initPowerUpSlot();
        this.listenToEnemyKills();

        this.angle = Player.FACING_UP_ANGLE;
        this.selectPlayerShip(shipId);
        this._lastShotTime = 0;
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

    // Reward: raises the max health by a random amount, and heals the same amount
    public applyHealthBonus(range: RangeData) {
        const health = this.getComponent(Health);
        if (!health || !this.active)
            return;

        const amount: number = Phaser.Math.Between(range.min, range.max);
        health.increaseMax(amount, this._playerData.maxHealthCap);
        health.heal(amount);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        this.getComponent(PowerUpSlot)?.update(deltaTime);
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

    private initHealth() {
        const health = new Health(this._startingHealth, this);
        health.on(Health.HIT_EVENT, this.disableCollisionsBriefly, this);
        this.addComponent(health);
    }

    // Disabled until a boss can be finished
    private initChargeLaser() {
        const bossesData = this.scene.cache.json.get(GameConstants.DataKeys.BOSSES) as BossesData;
        this.addComponent(new ChargeLaser(this, bossesData.finisher));
    }

    private initPowerUpSlot() {
        const powerUpSlot = new PowerUpSlot();
        powerUpSlot.on(PowerUpSlot.START_EVENT, this.onPowerUpStarted, this);
        powerUpSlot.on(PowerUpSlot.END_EVENT, this.onPowerUpEnded, this);
        this.addComponent(powerUpSlot);
    }

    // Game events outlive the scene: stop listening when it shuts down (e.g. on restart)
    private listenToEnemyKills() {
        const gameEvents = this.scene.game.events;
        gameEvents.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        this.scene.events.once(Scenes.Events.SHUTDOWN, () => {
            gameEvents.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        });
    }

    private disableCollisionsBriefly() {
        this.arcadeBody.setEnable(false);

        this.scene.time.delayedCall(Player.HIT_INVULNERABILITY_DURATION, () => {
            // A dead player stays disabled
            if (this.active)
                this.arcadeBody.setEnable(true);
        });
    }

    // Every small enemy killed gives a little health back (the bosses give their own reward)
    private onEnemyKilled(enemy: BaseEnemy) {
        if (this.active && !(enemy instanceof Boss))
            this.getComponent(Health)?.heal(this._playerData.killHeal);
    }

    private onPowerUpStarted(effects: PowerUpEffects, level: number) {
        this.refreshStats();

        // The shield is set back to its full value (it does not stack)
        const health = this.getComponent(Health);
        if (health && effects.shield)
            health.addShield(effects.shield - health.shield);

        // The ship glows with the color of the power-up, stronger at each level (WebGL only, hence the "?.")
        this.preFX?.clear();
        this.preFX?.addGlow(Display.Color.HexStringToColor(effects.color).color,
            Player.POWER_UP_GLOW_BASE + level * Player.POWER_UP_GLOW_PER_LEVEL);
    }

    private onPowerUpEnded() {
        this.refreshStats();
        this.getComponent(Health)?.clearShield();
        this.preFX?.clear();
    }

    // Stats of the ship, modified by the active power-up if there is one
    private refreshStats() {
        const effects = this.getComponent(PowerUpSlot)?.effects;

        this.refreshMovement(effects);
        this.refreshWeapon(effects);
        this.refreshFireRate(effects);
    }

    private refreshMovement(effects: PowerUpEffects | undefined) {
        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed * (effects?.speedMultiplier ?? 1));
    }

    private refreshWeapon(effects: PowerUpEffects | undefined) {
        const weapon = this.getComponent(SpreadWeapon);
        const bulletData: BulletData = effects?.weapon ? toBulletData(effects.weapon.bullet) : this._bulletData;

        weapon?.setBulletData({...bulletData, piercing: effects?.piercing ?? false});
        weapon?.setSpread(effects?.spread ?? Player.SINGLE_SHOT);
        weapon?.setDamageMultiplier(this._playerShipData.damage * (effects?.damageMultiplier ?? 1));
    }

    private refreshFireRate(effects: PowerUpEffects | undefined) {
        this._rateOfFire = (effects?.weapon?.fireRate ?? Player.DEFAULT_RATE_OF_FIRE) * (effects?.fireRateMultiplier ?? 1);
        this._shootSound = effects?.weapon?.sound ?? Player.DEFAULT_SHOOT_SOUND;
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

        this.getComponent(SpreadWeapon)?.shoot(this);
        this.scene.sound.play(this._shootSound);

        this._lastShotTime = timeSinceLaunch;
    }

    private isWeaponReady(timeSinceLaunch: number): boolean {
        return timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000;
    }
}
