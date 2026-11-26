import type {BulletData} from '../gameData/BulletData.ts';
import BaseEnemy from './BaseEnemy.ts';
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Enemy extends BaseEnemy {
    private readonly _bulletData: BulletData = {
        width: 12,
        height: 12,
        color: 0xf25f5c,
        speed: 512,
        damage: 10,
    };

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this.initHealth(1);
        this.addComponent(new Movement(0.2));
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        this.angle = 90;

        this.initShootTimer(Phaser.Math.Between(2000, 3000));

        // Create animation when enemy is about to shoot in the global animation manager
        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: 4,
            });
        }

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

        super.disable();
    }

    protected shoot() {
        this.play('ufoShoot');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture('sprites', 'ufoRed');

            this.getComponent(Weapon)?.shoot(this);
            this.scene.sound.play('sfx_laser2');
        });
    }

    protected move(deltaTime: number) {
        this.getComponent(Movement)?.moveVertically(this, deltaTime);
    }
}
