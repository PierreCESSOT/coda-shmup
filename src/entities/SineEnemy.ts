import type {SineEnemyData} from '../gameData/EnemiesData.ts';
import {toBulletData} from '../gameData/BulletConfigData.ts';
import BaseEnemy from './BaseEnemy.ts';
import SineMovement from "../components/SineMovement.ts";
import SpreadWeapon from "../components/SpreadWeapon.ts";
import GameConstants from "../GameConstants.ts";

// Enemy moving along a sine wave and firing spread shots, fully configured via JSON
export default class SineEnemy extends BaseEnemy {
    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: SineEnemyData) {
        this.setTexture(GameConstants.ATLAS_KEY, data.texture);

        this.initHealth(data.health);
        this.addComponent(new SineMovement(data.movement));
        this.addComponent(new SpreadWeapon(bulletsGroup, toBulletData(data.spreadShot.bullet), data.spreadShot));

        this.angle = BaseEnemy.FACING_DOWN_ANGLE;

        this.initShootTimer(data.spreadShot.delay);

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number) {
        super.enable(x, y);

        this.getComponent(SineMovement)?.reset(x);
    }

    protected shoot() {
        this.getComponent(SpreadWeapon)?.shoot(this);
        this.scene.sound.play(GameConstants.AudioKeys.ENEMY_SHOOT);
    }

    protected move(deltaTime: number) {
        this.getComponent(SineMovement)?.move(this, deltaTime);
    }
}
