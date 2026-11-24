import {Display} from 'phaser';
import type {BulletData} from '../gameData/BulletData.ts';
import type {SineEnemyData} from '../gameData/EnemiesData.ts';
import BaseEnemy from './BaseEnemy.ts';
import SineMovement from "../components/SineMovement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";

// Enemy moving along a sine wave and firing spread shots, fully configured via JSON
export default class SineEnemy extends BaseEnemy {
    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: SineEnemyData) {
        this.setTexture('sprites', data.texture);

        const bulletData: BulletData = {
            ...data.spreadShot.bullet,
            color: Display.Color.HexStringToColor(data.spreadShot.bullet.color).color
        };

        this.initHealth(data.health);
        this.addComponent(new SineMovement(data.movement));
        this.addComponent(new SpreadWeapon(bulletsGroup, bulletData, data.spreadShot));

        this.angle = 90;

        this.initShootTimer(data.spreadShot.delay);

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this.getComponent(SineMovement)?.reset(x);
    }

    protected shoot() {
        this.getComponent(SpreadWeapon)?.shoot(this);
        this.scene.sound.play('sfx_laser2');
    }

    protected move(deltaTime: number) {
        this.getComponent(SineMovement)?.move(this, deltaTime);
    }
}
