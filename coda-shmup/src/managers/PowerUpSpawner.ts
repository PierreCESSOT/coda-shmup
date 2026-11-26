import {Physics, Scene, Scenes} from "phaser";
import PowerUpSlot from "../components/PowerUpSlot.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import PowerUp from "../entities/PowerUp.ts";
import type {PowerUpData, PowerUpDefinition, PowerUpsData} from "../gameData/PowerUpsData.ts";
import GameConstants from "../GameConstants.ts";

/**
 * Fait tomber des bonus quand des ennemis meurent, et les donne au joueur quand il les touche.
 *  - ennemi normal : entre dropChance.min et dropChance.max de chance de lâcher un bonus
 *  - boss : lâche toujours un bonus
 * Le bonus est tiré au hasard dans powerups.json.
 * Attraper un bonus différent de celui qui est actif les fusionne en un combo (voir "combos" dans le JSON).
 * Pendant un combo, attraper un de ses deux bonus lui ajoute du temps (comboPartBonus) ;
 * un autre bonus disparaît sans effet.
 */
export default class PowerUpSpawner {
    private readonly _scene: Scene;
    private readonly _data: PowerUpsData;
    private readonly _powerUps: Physics.Arcade.Group;

    public constructor(scene: Scene, player: Player) {
        this._scene = scene;
        this._data = scene.cache.json.get('powerups') as PowerUpsData;
        this._powerUps = scene.physics.add.group({
            classType: PowerUp,
            defaultKey: 'sprites',
            defaultFrame: this._data.powerUps[0].texture
        });

        scene.physics.add.overlap(player, this._powerUps, (_player, powerUp) => {
            this.collect(player, powerUp as unknown as PowerUp);
        });

        // Les événements du jeu survivent à la scène : on arrête d'écouter quand elle s'arrête
        const gameEvents = scene.game.events;
        gameEvents.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        scene.events.once(Scenes.Events.SHUTDOWN, () => {
            gameEvents.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        });
    }

    /**
     * Ce qu'il faut activer quand le joueur attrape "picked" alors que "active" (pas un combo) est en cours :
     *  - rien d'actif, ou le même bonus : le bonus attrapé (le slot gère le niveau en plus)
     *  - un autre bonus : le combo des deux, s'il existe
     */
    private resolvePickedPowerUp(active: PowerUpDefinition | undefined, picked: PowerUpData): PowerUpDefinition {
        if (!active || active.id === picked.id)
            return picked;

        const combo = this._data.combos.find(combo =>
            combo.parts.includes(active.id) && combo.parts.includes(picked.id));
        return combo ?? picked;
    }

    private onEnemyKilled(enemy: BaseEnemy) {
        const alwaysDrops: boolean = enemy instanceof Boss;
        const chance: number = Phaser.Math.FloatBetween(this._data.dropChance.min, this._data.dropChance.max);
        if (alwaysDrops || Math.random() < chance)
            this.spawn(enemy.x, enemy.y);
    }

    private spawn(x: number, y: number) {
        const powerUp = this._powerUps.get() as PowerUp;
        if (!powerUp)
            return;

        const data = Phaser.Utils.Array.GetRandom(this._data.powerUps);
        powerUp.enable(x, y, data, this._data.fallSpeed);
    }

    private collect(player: Player, powerUp: PowerUp) {
        const slot = player.getComponent(PowerUpSlot);
        if (!powerUp.active || !slot)
            return;

        // Le bonus disparaît dans tous les cas, même s'il n'a pas d'effet (pendant un combo)
        powerUp.disable();
        this._scene.sound.play('sfx_laser1', {rate: 1.5});

        const picked: PowerUpData = powerUp.powerUpData;
        const activeCombo = this._data.combos.find(combo => combo.id === slot.current?.id);
        if (activeCombo) {
            // Un des bonus du combo : il dure plus longtemps. Sinon, rien
            if (activeCombo.parts.includes(picked.id))
                slot.extend(this._data.comboPartBonus);
            return;
        }

        slot.activate(this.resolvePickedPowerUp(slot.current, picked));
    }
}
