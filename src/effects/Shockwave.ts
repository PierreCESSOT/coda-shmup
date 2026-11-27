import {GameObjects, Physics, Scene, Scenes} from "phaser";
import Health from "../components/Health.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Bullet from "../entities/Bullet.ts";
import type {ShockwaveData} from "../gameData/PowerUpsData.ts";

// The groups that the shockwave can hit
export type ShockwaveTargets = {
    enemies: Physics.Arcade.Group[];    // Small enemies: destroyed
    bullets: Physics.Arcade.Group;      // Enemy bullets: destroyed
    bosses: Physics.Arcade.Group;       // Bosses: take damage, only once
};

export type ShockwaveSetup = {
    x: number;                          // Where the wave starts
    y: number;
    data: ShockwaveData;
    targets: ShockwaveTargets;
};

/**
 * A circle that grows from a point and sweeps everything on its way.
 * It updates itself on every frame of the scene, then destroys itself when it reached its max size.
 */
export default class Shockwave {
    private static readonly RING_DEPTH: number = 10;
    private static readonly RING_THICKNESS: number = 40;
    private static readonly SHAKE_DURATION: number = 400;
    private static readonly SHAKE_INTENSITY: number = 0.02;
    private static readonly FLASH_DURATION: number = 200;
    private static readonly FLASH_RGB: [number, number, number] = [255, 160, 60];

    private readonly _scene: Scene;
    private readonly _x: number;
    private readonly _y: number;
    private readonly _data: ShockwaveData;
    private readonly _targets: ShockwaveTargets;
    private readonly _color: number;
    private readonly _ring: GameObjects.Graphics;
    private readonly _hitBosses: Set<BaseEnemy> = new Set();
    private _radius: number = 0;

    public constructor(scene: Scene, setup: ShockwaveSetup) {
        this._scene = scene;
        this._x = setup.x;
        this._y = setup.y;
        this._data = setup.data;
        this._targets = setup.targets;
        this._color = Phaser.Display.Color.HexStringToColor(setup.data.color).color;
        this._ring = scene.add.graphics().setDepth(Shockwave.RING_DEPTH).setBlendMode(Phaser.BlendModes.ADD);

        scene.cameras.main.shake(Shockwave.SHAKE_DURATION, Shockwave.SHAKE_INTENSITY);
        scene.cameras.main.flash(Shockwave.FLASH_DURATION, ...Shockwave.FLASH_RGB);

        scene.events.on(Scenes.Events.UPDATE, this.update, this);
        scene.events.once(Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    private update(_time: number, deltaTime: number) {
        this._radius += this._data.speed * deltaTime;

        this.drawRing();
        this.sweepTargets();

        if (this._radius >= this._data.maxRadius)
            this.destroy();
    }

    // The ring fades out while it grows
    private drawRing() {
        const progress: number = this._radius / this._data.maxRadius;
        this._ring.clear();
        this._ring.lineStyle(Shockwave.RING_THICKNESS, this._color, 1 - progress);
        this._ring.strokeCircle(this._x, this._y, this._radius);
    }

    private sweepTargets() {
        for (const enemies of this._targets.enemies)
            this.forEachTouched(enemies, enemy => this.destroyEnemy(enemy as BaseEnemy));
        this.forEachTouched(this._targets.bullets, bullet => (bullet as Bullet).disable());
        this.forEachTouched(this._targets.bosses, boss => this.damageBoss(boss as BaseEnemy));
    }

    // Calls "action" on every active object of the group that the ring has reached
    private forEachTouched(group: Physics.Arcade.Group, action: (target: GameObjects.GameObject) => void) {
        for (const child of group.getChildren()) {
            const target = child as GameObjects.Sprite;
            if (target.active && Phaser.Math.Distance.Between(this._x, this._y, target.x, target.y) <= this._radius)
                action(target);
        }
    }

    private destroyEnemy(enemy: BaseEnemy) {
        const health = enemy.getComponent(Health);
        if (health && health.current > 0)
            health.damage(health.current);
    }

    private damageBoss(boss: BaseEnemy) {
        if (this._hitBosses.has(boss))
            return;

        this._hitBosses.add(boss);
        boss.getComponent(Health)?.damage(this._data.bossDamage);
    }

    private destroy() {
        this._scene.events.off(Scenes.Events.UPDATE, this.update, this);
        this._scene.events.off(Scenes.Events.SHUTDOWN, this.destroy, this);
        this._ring.destroy();
    }
}
