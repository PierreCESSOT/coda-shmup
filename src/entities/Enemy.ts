import type {BulletData} from '../gameData/BulletData.ts';
import BaseEnemy from './BaseEnemy.ts';
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";
import GameConstants from "../GameConstants.ts";

export default class Enemy extends BaseEnemy {
    public static readonly IDLE_FRAME: string = 'ufoRed';

    private static readonly HEALTH: number = 1;
    private static readonly SPEED: number = 0.2;
    private static readonly MIN_SHOOT_DELAY: number = 2000;
    private static readonly MAX_SHOOT_DELAY: number = 3000;
    private static readonly SHOOT_ANIMATION_KEY: string = 'ufoShoot';
    private static readonly SHOOT_ANIMATION_FRAMES: string[] = [Enemy.IDLE_FRAME, 'ufoRed-shoot0', 'ufoRed-shoot1'];
    private static readonly SHOOT_ANIMATION_FRAME_RATE: number = 4;

    private readonly _bulletData: BulletData = {
        width: 12,
        height: 12,
        color: 0xf25f5c,
        speed: 512,
        damage: 1,
    };

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this.initHealth(Enemy.HEALTH);
        this.addComponent(new Movement(Enemy.SPEED));
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        this.angle = BaseEnemy.FACING_DOWN_ANGLE;

        this.initShootTimer(Phaser.Math.Between(Enemy.MIN_SHOOT_DELAY, Enemy.MAX_SHOOT_DELAY));
        this.createShootAnimation();

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

        super.disable();
    }

    protected shoot() {
        this.play(Enemy.SHOOT_ANIMATION_KEY);
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture(GameConstants.ATLAS_KEY, Enemy.IDLE_FRAME);

            this.getComponent(Weapon)?.shoot(this);
            this.scene.sound.play(GameConstants.AudioKeys.ENEMY_SHOOT);
        });
    }

    protected move(deltaTime: number) {
        this.getComponent(Movement)?.moveVertically(this, deltaTime);
    }

    // The animation played when the enemy is about to shoot lives in the global animation manager
    private createShootAnimation() {
        if (this.scene.anims.exists(Enemy.SHOOT_ANIMATION_KEY))
            return;

        this.scene.anims.create({
            key: Enemy.SHOOT_ANIMATION_KEY,
            frames: Enemy.SHOOT_ANIMATION_FRAMES.map(frame => ({key: GameConstants.ATLAS_KEY, frame})),
            frameRate: Enemy.SHOOT_ANIMATION_FRAME_RATE,
        });
    }
}
