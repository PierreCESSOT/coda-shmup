import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    public enabled: boolean = true;

    private readonly _bullets: Physics.Arcade.Group;
    private _bulletData: BulletData;
    private _damageMultiplier: number = 1;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData) {
        if (!bullets) {
            console.error("Weapon 'bullets' group cannot be null or undefined");
        }

        this._bullets = bullets;
        this._bulletData = bulletData;
    }

    // Change le type de balles tirées (ex : passer au laser du bonus SUPER DAMAGE)
    public setBulletData(bulletData: BulletData) {
        this._bulletData = bulletData;
    }

    // Multiplie les dégâts de toutes les balles tirées (ex : vaisseau plus puissant)
    public setDamageMultiplier(multiplier: number) {
        this._damageMultiplier = multiplier;
    }

    public shoot(source: Entity) {
        if (!this.enabled)
            return;

        this.fireBullet(source, source.rotation);
    }

    // Tire une seule balle depuis l'entité, dans la direction donnée (en radians)
    protected fireBullet(source: Entity, direction: number) {
        if (!this._bullets)
            return;

        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            const bulletData: BulletData = {...this._bulletData, damage: this._bulletData.damage * this._damageMultiplier};

            // Vecteur "devant" correspondant à la direction donnée
            const forward: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0).rotate(direction);
            const bulletVelocity: Phaser.Math.Vector2 = forward.clone().scale(this._bulletData.speed);
            bullet.enable(source.x + forward.x * source.arcadeBody.radius, source.y + forward.y * source.arcadeBody.radius,
                bulletVelocity.x, bulletVelocity.y, bulletData);

            // Maths way
            // const forwardVectorX: number = Math.cos(direction);
            // const forwardVectorY: number = Math.sin(direction);
            // const bulletVelocityX: number = forwardVectorX * this._bulletData.speed;
            // const bulletVelocityY: number = forwardVectorY * this._bulletData.speed;
            // bullet.enable(source.x + forwardVectorX * source.arcadeBody.radius, source.y + forwardVectorY * source.arcadeBody.radius,
            //     bulletVelocityX, bulletVelocityY, this._bulletData);
        }
    }
}