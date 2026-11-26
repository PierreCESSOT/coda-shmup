import {Display, Input, Scene, Scenes} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import type {PowerUpEffects} from "../gameData/PowerUpsData.ts";
import type {SpreadData} from "../gameData/SpreadShotData.ts";
import {PlayerData} from "../gameData/PlayerData.ts";
import type {RangeData} from "../gameData/RangeData.ts";
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

/**
 * Le vaisseau du joueur.
 *
 * Contrôles :
 *  - Flèches gauche/droite : bouger (avec Maj : tourner)
 *  - Espace : tirer
 *  - F (maintenir puis lâcher) : laser chargé pour achever un boss
 *  - 1, 2, 3 : changer de design en cours de partie
 *
 * Composants : Health, Movement, SpreadWeapon (une balle, ou trois avec un bonus), PowerUpSlot (bonus ramassé)
 * et ChargeLaser (rayon de fin).
 * Ses stats (vitesse, dégâts, PV) dépendent du vaisseau choisi (playerShips.json).
 */
export default class Player extends Entity {
    // Tir normal : une balle toutes les 0,5 s
    private static readonly DEFAULT_RATE_OF_FIRE: number = 0.5;
    private static readonly DEFAULT_SHOOT_SOUND: string = 'sfx_laser1';
    private static readonly INVULNERABILITY_DURATION: number = 50;   // Après un coup, en ms
    private static readonly SINGLE_SHOT: SpreadData = {count: 1, angle: 0};

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
    private _rateOfFire: number;        // Temps entre deux tirs, en secondes
    private _shootSound: string;
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

        // Vaisseau choisi dans le menu d'accueil : ses PV sont fixés pour toute la partie
        const shipId: number = this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_ID) ?? 1;
        this._startingHealth = (this.scene.cache.json.get('playerShips') as PlayerShipsData)[shipId].health;

        this.initComponents(bulletsGroup);
        this.listenToKills();

        this.angle = -90;   // Regarde vers le haut
        this.selectPlayerShip(shipId);
        this._lastShotTime = 0;
    }

    // Design, couleur, vitesse et dégâts du vaisseau (les PV, eux, ne changent pas en cours de partie)
    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        const shipColors = this.scene.cache.json.get('shipColors') as ShipColorData[];
        const colorIndex: number = this.scene.registry.get(RegistryConstants.Keys.PLAYER_SHIP_COLOR) ?? 0;
        ShipAppearance.apply(this, this._playerShipData, shipColors[colorIndex] ?? shipColors[0]);

        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.refreshStats();
    }

    // Bonus : augmente les PV max d'un nombre de PV tiré au hasard, et soigne du même montant
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
        this.handleMovement(deltaTime);
        this.handleChargeLaser(deltaTime);
        this.handleShooting(timeSinceLaunch);
    }

    // ---------- Initialisation ----------

    private initComponents(bulletsGroup: Phaser.Physics.Arcade.Group) {
        const health = new Health(this._startingHealth, this);
        health.on(Health.HIT_EVENT, this.onHit, this);
        this.addComponent(health);

        this.addComponent(new Movement());
        this.addComponent(new SpreadWeapon(bulletsGroup, this._bulletData, Player.SINGLE_SHOT));

        // Désactivé tant qu'aucun boss n'est presque mort
        const bossesData = this.scene.cache.json.get('bosses') as BossesData;
        this.addComponent(new ChargeLaser(this, bossesData.finisher));

        const powerUpSlot = new PowerUpSlot();
        powerUpSlot.on(PowerUpSlot.START_EVENT, this.onPowerUpStarted, this);
        powerUpSlot.on(PowerUpSlot.END_EVENT, this.onPowerUpEnded, this);
        this.addComponent(powerUpSlot);
    }

    private listenToKills() {
        // Les événements du jeu survivent à la scène : on arrête d'écouter quand elle s'arrête (ex : restart)
        const gameEvents = this.scene.game.events;
        gameEvents.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        this.scene.events.once(Scenes.Events.SHUTDOWN, () => {
            gameEvents.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        });
    }

    // ---------- Contrôles (appelés à chaque frame) ----------

    private handleMovement(deltaTime: number) {
        const direction: number = this._cursorKeys.left.isDown ? -1 : this._cursorKeys.right.isDown ? 1 : 0;

        if (direction !== 0) {
            if (this._cursorKeys.shift.isDown)
                this.angle += direction * this._playerShipData.movementSpeed * deltaTime;
            else
                this.getComponent(Movement)?.moveHorizontally(this, direction * deltaTime);
        }

        // Ne pas sortir de l'écran
        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, this.scene.cameras.main.width - this.displayWidth / 2);
    }

    private handleChargeLaser(deltaTime: number) {
        const isHeld: boolean = this.active && (this._chargeLaserKey?.isDown ?? false);
        this.getComponent(ChargeLaser)?.update(this, isHeld, deltaTime);
    }

    private handleShooting(timeSinceLaunch: number) {
        if (!this._cursorKeys.space.isDown)
            return;

        if (timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000) {
            this.getComponent(SpreadWeapon)?.shoot(this);
            this.scene.sound.play(this._shootSound);
            this._lastShotTime = timeSinceLaunch;
        }
    }

    // ---------- Réactions aux événements ----------

    private onHit() {
        // Touché : invulnérable un court instant
        this.arcadeBody.setEnable(false);
        this.scene.time.delayedCall(Player.INVULNERABILITY_DURATION, () => {
            // Un joueur mort reste désactivé
            if (this.active)
                this.arcadeBody.setEnable(true);
        });
    }

    // Nouveau bonus, ou niveau en plus du même bonus
    // Chaque petit ennemi éliminé rend un peu de vie (les boss donnent leur propre récompense)
    private onEnemyKilled(enemy: BaseEnemy) {
        if (this.active && !(enemy instanceof Boss))
            this.getComponent(Health)?.heal(this._playerData.killHeal);
    }

    private onPowerUpStarted(effects: PowerUpEffects, _duration: number, level: number) {
        this.refreshStats();

        // Le bouclier est remis à sa valeur pleine (et ne s'empile pas)
        const health = this.getComponent(Health);
        if (health && effects.shield)
            health.addShield(effects.shield - health.shield);

        // Le vaisseau brille de la couleur du bonus, plus fort à chaque niveau (seulement en WebGL, d'où le "?.")
        this.preFX?.clear();
        this.preFX?.addGlow(Display.Color.HexStringToColor(effects.color).color, 3 + level * 3);
    }

    private onPowerUpEnded() {
        this.refreshStats();
        this.getComponent(Health)?.clearShield();
        this.preFX?.clear();
    }

    // ---------- Stats et armes ----------

    // Stats du vaisseau, modifiées par le bonus actif s'il y en a un
    private refreshStats() {
        const effects = this.getComponent(PowerUpSlot)?.effects;
        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed * (effects?.speedMultiplier ?? 1));

        const weapon = this.getComponent(SpreadWeapon);
        const bulletData: BulletData = effects?.weapon ? toBulletData(effects.weapon.bullet) : this._bulletData;
        weapon?.setBulletData({...bulletData, piercing: effects?.piercing ?? false});
        weapon?.setSpread(effects?.spread ?? Player.SINGLE_SHOT);
        weapon?.setDamageMultiplier(this._playerShipData.damage * (effects?.damageMultiplier ?? 1));

        this._rateOfFire = (effects?.weapon?.fireRate ?? Player.DEFAULT_RATE_OF_FIRE) * (effects?.fireRateMultiplier ?? 1);
        this._shootSound = effects?.weapon?.sound ?? Player.DEFAULT_SHOOT_SOUND;
    }
}
