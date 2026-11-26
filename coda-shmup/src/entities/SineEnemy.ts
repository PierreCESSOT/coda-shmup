import type {SineEnemyData} from '../gameData/EnemiesData.ts';
import {toBulletData} from '../gameData/BulletConfigData.ts';
import BaseEnemy from './BaseEnemy.ts';
import SineMovement from "../components/SineMovement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";

// Ennemi qui descend en zigzag et tire en éventail, entièrement réglé dans enemies.json
export default class SineEnemy extends BaseEnemy {
    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: SineEnemyData) {
        this.setTexture('sprites', data.texture);

        this.initHealth(data.health);
        this.addComponent(new SineMovement(data.movement));
        this.addComponent(new SpreadWeapon(bulletsGroup, toBulletData(data.spreadShot.bullet), data.spreadShot));

        this.angle = 90;

        this.initShootTimer(data.spreadShot.delay);

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this.getComponent(SineMovement)?.reset(this);
    }

    protected shoot() {
        this.getComponent(SpreadWeapon)?.shoot(this);
        this.scene.sound.play('sfx_laser2');
    }

    protected move(deltaTime: number) {
        this.getComponent(SineMovement)?.move(this, deltaTime);
    }
}
