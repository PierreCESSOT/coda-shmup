import {Display} from 'phaser';
import BaseEnemy from './BaseEnemy.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import IPatternMovement from "../components/IPatternMovement.ts";
import BossAttackSequence from "../components/BossAttackSequence.ts";
import type {BossData, BossSummonData} from "../gameData/BossesData.ts";
import PatternMovementFactory from "../utils/PatternMovementFactory.ts";

/**
 * Un boss, entièrement décrit par une entrée de bosses.json.
 *
 * Sa vie se déroule en 3 temps :
 *  1. Il descend jusqu'à sa position (entry.targetY)
 *  2. Il bouge (movement) et attaque (attacks) en boucle
 *  3. Sous un seuil de vie, les balles ne lui font plus rien : il faut le finir au laser chargé (finish())
 *
 * Il prévient le reste du jeu avec des événements, sans savoir qui écoute.
 */
export default class Boss extends BaseEnemy {
    public static readonly FINISHER_READY_EVENT: string = 'finisherReady';  // Le laser peut l'achever
    public static readonly SUMMON_EVENT: string = 'summon';                 // Il appelle des renforts

    private _data: BossData;
    private _isUltra: boolean;
    private _finisherThreshold: number;
    private _movement: IPatternMovement;
    private _attacks: BossAttackSequence;
    private _hasEntered: boolean = false;
    private _isFinisherReady: boolean = false;
    private _summonTimer: Phaser.Time.TimerEvent | undefined;

    public get bossName(): string {
        return this._data.name;
    }

    public get isUltra(): boolean {
        return this._isUltra;
    }

    public get isFinisherReady(): boolean {
        return this._isFinisherReady;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: BossData, health: number,
                finisherThreshold: number, target: Entity, isUltra: boolean) {
        this._data = data;
        this._isUltra = isUltra;
        this._finisherThreshold = finisherThreshold;

        // Apparence
        this.setTexture('sprites', data.texture);
        this.restoreAppearance();
        this.angle = 90;    // Regarde vers le bas
        this.setScale(data.scale);

        // Composants : vie, mouvement, attaques
        this.initHealth(health);
        this._movement = PatternMovementFactory.create(data.movement, target);
        this._attacks = new BossAttackSequence(bulletsGroup, data.attacks, target);
        this.addComponent(this._movement);
        this.addComponent(this._attacks);

        const bossHealth = this.getComponent(Health)!;
        bossHealth.on(Health.CHANGE_EVENT, () => this.onHealthChanged(bossHealth));

        // Hitbox ronde au centre du sprite (elle suit automatiquement le scale)
        const radius: number = Math.min(this.width, this.height) / 2;
        this.arcadeBody.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this._hasEntered = false;
        this._attacks.reset();
    }

    public disable() {
        super.disable();
        this.stopSummoning();
    }

    destroy(fromScene?: boolean) {
        this.stopSummoning();
        super.destroy(fromScene);
    }

    // Appelé quand le laser chargé touche le boss : il meurt d'un coup
    public finish() {
        if (!this._isFinisherReady)
            return;

        const health = this.getComponent(Health)!;
        health.enabled = true;
        health.damage(health.current);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // Pas d'attaque pendant l'entrée en scène
        if (this.active && this._hasEntered)
            this._attacks.update(this, deltaTime);
    }

    protected restoreAppearance() {
        if (this._data.tint)
            this.setTint(Display.Color.HexStringToColor(this._data.tint).color);
        else
            this.clearTint();
    }

    protected move(deltaTime: number) {
        if (this._hasEntered) {
            this._movement.move(this, deltaTime);
            return;
        }

        // Entrée en scène : descend jusqu'à sa position, puis commence son mouvement
        this.y += this._data.entry.speed * deltaTime;
        if (this.y >= this._data.entry.targetY) {
            this.y = this._data.entry.targetY;
            this._hasEntered = true;
            this._movement.reset(this);
        }
    }

    private onHealthChanged(health: Health) {
        if (health.current <= 0)
            return;

        const healthRatio: number = health.current / health.max;

        // Boss ultra : appelle des renforts sous un seuil de vie
        const summon = this._data.summon;
        if (summon && !this._summonTimer && healthRatio <= summon.healthThreshold)
            this.startSummoning(summon);

        // Presque mort : les balles ne le touchent plus, il faut le laser chargé
        if (!this._isFinisherReady && healthRatio <= this._finisherThreshold) {
            this._isFinisherReady = true;
            health.enabled = false;
            this.emit(Boss.FINISHER_READY_EVENT, this);
        }
    }

    private startSummoning(summon: BossSummonData) {
        this.emit(Boss.SUMMON_EVENT, this, summon);
        this._summonTimer = this.scene.time.addEvent({
            delay: summon.delay,
            loop: true,
            callback: () => this.emit(Boss.SUMMON_EVENT, this, summon)
        });
    }

    private stopSummoning() {
        this._summonTimer?.remove();
        this._summonTimer = undefined;
    }
}
