import {BulletData} from "../gameData/BulletData.ts";

export default class Bullet extends Phaser.GameObjects.Rectangle {
    private _arcadeBody: Phaser.Physics.Arcade.Body;

    private _damage: number = 0;
    private _bossDamage: number = 0;
    private _piercing: boolean = false;
    private readonly _hitTargets: Set<Phaser.GameObjects.GameObject> = new Set();

    public get damage(): number {
        return this._damage;
    }

    // Damage dealt to a boss
    public get bossDamage(): number {
        return this._bossDamage;
    }

    public init() {
        this.scene.physics.add.existing(this);

        this._arcadeBody = this.body as Phaser.Physics.Arcade.Body;
        this._arcadeBody.allowGravity = false;
        this._arcadeBody.setFriction(0, 0);
    }

    public enable(x: number, y: number, velocityX: number, velocityY: number, data: BulletData) {
        this.setPosition(x, y);
        this.setSize(data.width, data.height);
        this.setOrigin(0.5);
        this.setFillStyle(data.color);

        this.scene.physics.world.add(this._arcadeBody);
        this.setActive(true);
        this.setVisible(true);

        this._arcadeBody.setVelocity(velocityX, velocityY);
        this._damage = data.damage;
        this._bossDamage = data.damage * (data.bossDamageMultiplier ?? 1);
        this._piercing = data.piercing ?? false;
        this._hitTargets.clear();

        // Rotate the bullet to face the direction it's moving
        this.setRotation(this._arcadeBody.velocity.angle());
        this.fitBodyToRotation(data);
    }

    public disable() {
        this.scene.physics.world.disableBody(this._arcadeBody);
        this.setActive(false);
        this.setVisible(false);
    }

    // To call when the bullet hits a target. A normal bullet is disabled by its first hit.
    // Returns false if a piercing bullet already hit this target: the damage must not be counted twice
    public registerHit(target: Phaser.GameObjects.GameObject): boolean {
        if (this._hitTargets.has(target))
            return false;

        if (this._piercing)
            this._hitTargets.add(target);
        else
            this.disable();

        return true;
    }

    update(timeSinceLaunch: number, deltaTime: number) {
        super.update(timeSinceLaunch, deltaTime);

        // Bullets can fly in any direction: recycle them when they leave the screen on any side
        if (this.isOutsideScreen)
            this.disable();
    }

    private get isOutsideScreen(): boolean {
        const camera = this.scene.cameras.main;
        return this.x < -this.displayWidth || this.x > camera.width + this.displayWidth
            || this.y < -this.displayHeight || this.y > camera.height + this.displayHeight;
    }

    // Arcade bodies can't rotate: fit the body to the rotated bullet bounds
    private fitBodyToRotation(data: BulletData) {
        const cos: number = Math.abs(Math.cos(this.rotation));
        const sin: number = Math.abs(Math.sin(this.rotation));
        this._arcadeBody.setSize(data.width * cos + data.height * sin, data.width * sin + data.height * cos);
    }
}
