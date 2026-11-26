import {GameObjects, Physics, Scene, Scenes} from "phaser";
import Health from "../components/Health.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Bullet from "../entities/Bullet.ts";
import type {ShockwaveData} from "../gameData/PowerUpsData.ts";

// Les groupes que l'onde de choc peut toucher
export type ShockwaveTargets = {
    enemies: Physics.Arcade.Group[];    // Petits ennemis : détruits
    bullets: Physics.Arcade.Group;      // Balles ennemies : détruites
    bosses: Physics.Arcade.Group;       // Boss : prennent des dégâts, une seule fois
};

/**
 * Un cercle qui grandit à partir d'un point et balaie tout sur son passage.
 * Il se met à jour tout seul à chaque frame de la scène, puis se détruit quand il a atteint sa taille max.
 */
export default class Shockwave {
    private readonly _scene: Scene;
    private readonly _x: number;
    private readonly _y: number;
    private readonly _data: ShockwaveData;
    private readonly _targets: ShockwaveTargets;
    private readonly _color: number;
    private readonly _ring: GameObjects.Graphics;
    private readonly _hitBosses: Set<BaseEnemy> = new Set();
    private _radius: number = 0;

    public constructor(scene: Scene, x: number, y: number, data: ShockwaveData, targets: ShockwaveTargets) {
        this._scene = scene;
        this._x = x;
        this._y = y;
        this._data = data;
        this._targets = targets;
        this._color = Phaser.Display.Color.HexStringToColor(data.color).color;
        this._ring = scene.add.graphics().setDepth(10).setBlendMode(Phaser.BlendModes.ADD);

        scene.cameras.main.shake(400, 0.02);
        scene.cameras.main.flash(200, 255, 160, 60);

        scene.events.on(Scenes.Events.UPDATE, this.update, this);
        scene.events.once(Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    private update(_time: number, deltaTime: number) {
        this._radius += this._data.speed * deltaTime;

        // L'anneau s'efface en grandissant
        const progress: number = this._radius / this._data.maxRadius;
        this._ring.clear();
        this._ring.lineStyle(40, this._color, 1 - progress);
        this._ring.strokeCircle(this._x, this._y, this._radius);

        for (const enemies of this._targets.enemies)
            this.forEachTouched(enemies, enemy => this.destroyEnemy(enemy as BaseEnemy));
        this.forEachTouched(this._targets.bullets, bullet => (bullet as Bullet).disable());
        this.forEachTouched(this._targets.bosses, boss => this.damageBoss(boss as BaseEnemy));

        if (this._radius >= this._data.maxRadius)
            this.destroy();
    }

    // Appelle "action" sur chaque objet actif du groupe que l'anneau a atteint
    private forEachTouched(group: Physics.Arcade.Group, action: (target: Phaser.GameObjects.Components.Transform) => void) {
        for (const child of group.getChildren()) {
            const target = child as Phaser.GameObjects.Sprite;
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
