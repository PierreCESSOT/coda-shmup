import {Physics, Scene, Scenes} from "phaser";
import PowerUpSlot from "../components/PowerUpSlot.ts";
import BaseEnemy from "../entities/BaseEnemy.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import PowerUp from "../entities/PowerUp.ts";
import type {PowerUpComboData, PowerUpData, PowerUpDefinition, PowerUpsData} from "../gameData/PowerUpsData.ts";
import GameConstants from "../GameConstants.ts";

/**
 * Drops power-ups when enemies die, and gives them to the player when it touches them.
 *  - normal enemy: between dropChance.min and dropChance.max chance to drop a power-up
 *  - boss: always drops a power-up
 * The power-up is drawn at random in powerups.json.
 * Catching a power-up different from the active one merges them into a combo (see "combos" in the JSON).
 * During a combo, catching one of its two power-ups adds time to it (comboPartBonus);
 * any other power-up disappears without effect.
 */
export default class PowerUpSpawner {
    private static readonly PICKUP_SOUND_RATE: number = 1.5;

    private readonly _scene: Scene;
    private readonly _data: PowerUpsData;
    private readonly _powerUps: Physics.Arcade.Group;

    public constructor(scene: Scene, player: Player) {
        this._scene = scene;
        this._data = scene.cache.json.get(GameConstants.DataKeys.POWER_UPS) as PowerUpsData;
        this._powerUps = scene.physics.add.group({
            classType: PowerUp,
            defaultKey: GameConstants.ATLAS_KEY,
            defaultFrame: this._data.powerUps[0].texture,
            createCallback: (powerUp) => {
                (powerUp as PowerUp).init(this._data.fallSpeed);
            }
        });

        scene.physics.add.overlap(player, this._powerUps, (_player, powerUp) => {
            this.collect(player, powerUp as unknown as PowerUp);
        });

        // The game events outlive the scene: stop listening when it shuts down
        const gameEvents = scene.game.events;
        gameEvents.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        scene.events.once(Scenes.Events.SHUTDOWN, () => {
            gameEvents.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        });
    }

    private onEnemyKilled(enemy: BaseEnemy) {
        if (this.shouldDrop(enemy))
            this.spawn(enemy.x, enemy.y);
    }

    private shouldDrop(enemy: BaseEnemy): boolean {
        const alwaysDrops: boolean = enemy instanceof Boss;
        const chance: number = Phaser.Math.FloatBetween(this._data.dropChance.min, this._data.dropChance.max);

        return alwaysDrops || Math.random() < chance;
    }

    private spawn(x: number, y: number) {
        const powerUp = this._powerUps.get() as PowerUp | null;
        if (!powerUp)
            return;

        const data = Phaser.Utils.Array.GetRandom(this._data.powerUps);
        powerUp.enable(x, y, data);
    }

    private collect(player: Player, powerUp: PowerUp) {
        const slot = player.getComponent(PowerUpSlot);
        if (!powerUp.active || !slot)
            return;

        // The power-up disappears in all cases, even without effect (during a combo)
        powerUp.disable();
        this._scene.sound.play(GameConstants.AudioKeys.PLAYER_SHOOT, {rate: PowerUpSpawner.PICKUP_SOUND_RATE});

        const picked: PowerUpData = powerUp.powerUpData;
        const activeCombo = this._data.combos.find(combo => combo.id === slot.current?.id);
        if (activeCombo) {
            this.extendCombo(slot, activeCombo, picked);
            return;
        }

        slot.activate(this.resolvePickedPowerUp(slot.current, picked));
    }

    // During a combo, one of its two power-ups lasts longer. Any other power-up does nothing
    private extendCombo(slot: PowerUpSlot, combo: PowerUpComboData, picked: PowerUpData) {
        if (combo.parts.includes(picked.id))
            slot.extend(this._data.comboPartBonus);
    }

    /**
     * What to activate when the player catches "picked" while "active" (not a combo) is running:
     *  - nothing active, or the same power-up: the caught power-up (the slot handles the extra level)
     *  - another power-up: the combo of the two, if it exists
     */
    private resolvePickedPowerUp(active: PowerUpDefinition | undefined, picked: PowerUpData): PowerUpDefinition {
        if (!active || active.id === picked.id)
            return picked;

        const combo = this._data.combos.find(combo =>
            combo.parts.includes(active.id) && combo.parts.includes(picked.id));
        return combo ?? picked;
    }
}
