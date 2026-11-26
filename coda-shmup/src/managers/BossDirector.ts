import {Geom, Physics, Scene, Scenes} from "phaser";
import Health from "../components/Health.ts";
import ChargeLaser from "../components/ChargeLaser.ts";
import Boss from "../entities/Boss.ts";
import Player from "../entities/Player.ts";
import type {BossData, BossesData, BossSummonData} from "../gameData/BossesData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

/**
 * Le "chef d'orchestre" des boss :
 *  - QUAND : un boss arrive tous les "scoreInterval" points
 *  - LEQUEL : les boss normaux en boucle, et un boss ultra tous les "ultraEvery" boss
 *  - COMBIEN DE VIE : un peu plus à chaque cycle, la run est infinie
 *  - LA FIN : arme le laser chargé du joueur, vérifie s'il touche, et récompense le joueur
 *
 * Il ne crée pas les ennemis invoqués : il demande à l'EntityManager via onSummon.
 */
export default class BossDirector {
    private readonly _scene: Scene;
    private readonly _player: Player;
    private readonly _enemyBullets: Physics.Arcade.Group;
    private readonly _onSummon: (boss: Boss, summon: BossSummonData) => void;
    private readonly _data: BossesData;
    private readonly _bosses: Physics.Arcade.Group;

    private _currentBoss: Boss | undefined;
    private _bossCount: number = 0;         // Boss déjà vaincus
    private _regularBossCount: number = 0;  // Pour savoir quel boss normal vient ensuite
    private _ultraBossCount: number = 0;    // Pour savoir quel boss ultra vient ensuite
    private _nextBossScore: number;

    // Groupe physique des boss, pour les collisions
    public get bosses(): Physics.Arcade.Group {
        return this._bosses;
    }

    public get isBossFightActive(): boolean {
        return this._currentBoss !== undefined;
    }

    public constructor(scene: Scene, player: Player, enemyBullets: Physics.Arcade.Group,
                       onSummon: (boss: Boss, summon: BossSummonData) => void) {
        this._scene = scene;
        this._player = player;
        this._enemyBullets = enemyBullets;
        this._onSummon = onSummon;
        this._data = scene.cache.json.get('bosses') as BossesData;
        this._bosses = scene.physics.add.group();
        this._nextBossScore = this._data.scoreInterval;

        player.getComponent(ChargeLaser)?.on(ChargeLaser.FIRE_EVENT, this.onLaserFired, this);

        // Le registry est global au jeu : on arrête d'écouter quand la scène s'arrête
        const registryEvents = scene.registry.events;
        registryEvents.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        scene.events.once(Scenes.Events.SHUTDOWN, () => {
            registryEvents.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onScoreChanged, this);
        });
    }

    private onScoreChanged(_parent: unknown, score: number) {
        if (!this.isBossFightActive && score >= this._nextBossScore)
            this.spawnBoss();
    }

    private spawnBoss() {
        const isUltra: boolean = (this._bossCount + 1) % this._data.ultraEvery === 0;
        const bossData: BossData = this.pickNextBoss(isUltra);

        const boss = new Boss(this._scene, 0, 0, 'sprites', bossData.texture);
        boss.init(this._enemyBullets, bossData, this.computeHealth(bossData),
            this._data.finisher.healthThreshold, this._player, isUltra);
        this._bosses.add(boss);
        boss.enable(this._scene.cameras.main.centerX, 0);
        this._currentBoss = boss;

        boss.once(Boss.FINISHER_READY_EVENT, () => this.onFinisherReady(boss));
        boss.on(Boss.SUMMON_EVENT, this._onSummon);
        boss.getComponent(Health)?.once(Health.DEATH_EVENT, () => this.onBossKilled(boss));

        this._scene.game.events.emit(GameConstants.Events.BOSS_SPAWNED_EVENT, boss);
        console.log("[BossDirector] Boss spawned: " + bossData.name);
    }

    // Chaque liste (normaux, ultras) avance de son côté et recommence au début quand elle est finie
    private pickNextBoss(isUltra: boolean): BossData {
        if (isUltra)
            return this._data.ultraBosses[this._ultraBossCount++ % this._data.ultraBosses.length];

        return this._data.bosses[this._regularBossCount++ % this._data.bosses.length];
    }

    // Plus de vie à chaque cycle complet (un cycle se termine par un boss ultra)
    private computeHealth(bossData: BossData): number {
        const cycle: number = Math.floor(this._bossCount / this._data.ultraEvery);
        return Math.round(bossData.health * (1 + this._data.healthGrowthPerCycle * cycle));
    }

    private onFinisherReady(boss: Boss) {
        this._player.getComponent(ChargeLaser)?.arm();
        this._scene.game.events.emit(GameConstants.Events.BOSS_FINISHER_READY_EVENT, boss);
    }

    // Le rayon est une ligne épaisse : on agrandit le cercle du boss de la moitié de son épaisseur
    private onLaserFired(beam: Geom.Line) {
        const boss = this._currentBoss;
        if (!boss || !boss.isFinisherReady)
            return;

        const beamWidth: number = this._player.getComponent(ChargeLaser)?.beamWidth ?? 0;
        const hitCircle = new Geom.Circle(boss.x, boss.y, boss.arcadeBody.halfWidth + beamWidth / 2);
        if (Geom.Intersects.LineToCircle(beam, hitCircle))
            boss.finish();
    }

    private onBossKilled(boss: Boss) {
        this._currentBoss = undefined;
        this._bossCount++;
        const score: number = Number(this._scene.registry.get(RegistryConstants.Keys.PLAYER_SCORE));
        this._nextBossScore = score + this._data.scoreInterval;

        this._player.getComponent(ChargeLaser)?.disarm();

        // Récompense : plus de PV max, encore plus après un boss ultra
        const bonusData = (this._scene.cache.json.get('player') as PlayerData).healthBonus;
        this._player.applyHealthBonus(boss.isUltra ? bonusData.ultraBoss : bonusData.boss);

        this._scene.game.events.emit(GameConstants.Events.BOSS_KILLED_EVENT, boss);
        console.log("[BossDirector] Boss killed: " + boss.bossName);

        // Les boss ne sont pas réutilisés : on le détruit après son explosion
        this._scene.time.delayedCall(500, () => boss.destroy());
    }
}
