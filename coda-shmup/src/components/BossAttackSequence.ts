import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import SpreadWeapon from "./SpreadWeapon.ts";
import {toBulletData} from "../gameData/BulletConfigData.ts";
import type {BossAttackData} from "../gameData/BossesData.ts";

// Une attaque du boss, avec l'arme qui la tire
type Attack = {
    data: BossAttackData;
    weapon: SpreadWeapon;
    spinAngle: number;      // Rotation ajoutée par "spin" depuis le début, en radians
};

/**
 * Enchaîne les attaques d'un boss, dans l'ordre du JSON, puis recommence.
 *
 * Chaque attaque est tirée "repeat" fois, avec "delay" ms entre deux tirs,
 * puis on passe à la suivante.
 */
export default class BossAttackSequence implements IComponent {
    public enabled: boolean = true;

    private readonly _attacks: Attack[];
    private readonly _target: Entity;
    private _index: number = 0;             // Attaque en cours
    private _shotsLeft: number = 0;         // Tirs restants pour l'attaque en cours
    private _timeUntilNextShot: number = 0; // En millisecondes

    public constructor(bullets: Phaser.Physics.Arcade.Group, attacksData: BossAttackData[], target: Entity) {
        this._target = target;
        this._attacks = attacksData.map(data => ({
            data: data,
            weapon: new SpreadWeapon(bullets, toBulletData(data.bullet), data),
            spinAngle: 0
        }));
    }

    // Recommence à la première attaque, qui part tout de suite
    public reset() {
        this._timeUntilNextShot = 0;
        this.startAttack(0);
    }

    // À appeler à chaque frame : tire quand c'est l'heure
    public update(source: Entity, deltaTime: number) {
        if (!this.enabled || this._attacks.length === 0)
            return;

        this._timeUntilNextShot -= deltaTime;
        if (this._timeUntilNextShot > 0)
            return;

        const attack = this._attacks[this._index];
        const isFirstShot: boolean = this._shotsLeft === this.repeatCount(attack);
        this.fire(source, attack, isFirstShot);

        this._timeUntilNextShot = attack.data.delay;
        this._shotsLeft--;
        if (this._shotsLeft <= 0)
            this.startAttack((this._index + 1) % this._attacks.length);
    }

    private startAttack(index: number) {
        this._index = index;
        this._shotsLeft = this.repeatCount(this._attacks[index]);
    }

    private repeatCount(attack: Attack | undefined): number {
        return attack?.data.repeat ?? 1;
    }

    private fire(source: Entity, attack: Attack, playSound: boolean) {
        // Direction de base : vers le joueur, ou droit devant le boss
        const baseDirection: number = attack.data.aimAtPlayer && this._target.active
            ? Phaser.Math.Angle.Between(source.x, source.y, this._target.x, this._target.y)
            : source.rotation;
        const offset: number = Phaser.Math.DegToRad(attack.data.angleOffset ?? 0) + attack.spinAngle;

        attack.weapon.shootAt(source, baseDirection + offset);
        // "mirrored" : on tire aussi de l'autre côté, comme les deux pinces de la Hive Queen
        if (attack.data.mirrored)
            attack.weapon.shootAt(source, baseDirection - offset);

        // "spin" : chaque tir est un peu plus tourné que le précédent, ce qui dessine une spirale
        attack.spinAngle += Phaser.Math.DegToRad(attack.data.spin ?? 0);

        // Un seul son par attaque, sinon les spirales font un bruit continu
        if (playSound)
            source.scene.sound.play('sfx_laser2');
    }
}
