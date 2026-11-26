import {GameObjects, Scene} from 'phaser';
import SaveManager from "../managers/SaveManager.ts";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import {ShipColorData} from "../gameData/ShipColorData.ts";
import ShipAppearance from "../utils/ShipAppearance.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveConstants from "../SaveConstants.ts";
import {futureText} from "./TextStyles.ts";

// Une ligne de la fiche du vaisseau : "SPEED [#####     ]"
type StatRow = {
    label: string;
    read: (ship: PlayerShipData) => number;
    bar: GameObjects.Rectangle;
    max: number;            // Meilleure valeur parmi tous les vaisseaux = barre pleine
};

/**
 * Menu de personnalisation du vaisseau, sur l'écran d'accueil.
 *  - Gauche / droite : change le design (playerShips.json)
 *  - Haut / bas : change la couleur (shipColors.json)
 * Sous l'aperçu, une fiche montre le nom et les stats du vaisseau (vitesse, dégâts, PV).
 *
 * Le choix est :
 *  - sauvegardé (SaveManager), pour être retrouvé à la prochaine partie
 *  - mis dans le registry, où le Player le lit au lancement de la partie
 */
export default class ShipCustomizationMenu {
    private readonly _scene: Scene;
    private readonly _saveManager: SaveManager;
    private readonly _shipsData: PlayerShipsData;
    private readonly _shipIds: string[];
    private readonly _colors: ShipColorData[];
    private readonly _preview: GameObjects.Sprite;
    private readonly _colorText: GameObjects.Text;
    private readonly _nameText: GameObjects.Text;
    private readonly _statRows: StatRow[] = [];
    private _shipIndex: number = 0;
    private _colorIndex: number = 0;

    public constructor(scene: Scene, saveManager: SaveManager) {
        this._scene = scene;
        this._saveManager = saveManager;
        this._shipsData = scene.cache.json.get('playerShips') as PlayerShipsData;
        this._shipIds = Object.keys(this._shipsData);
        this._colors = scene.cache.json.get('shipColors') as ShipColorData[];

        this.loadSavedChoice();

        const centerX: number = scene.scale.width / 2;
        const previewY: number = scene.scale.height / 2 - 60;
        this._nameText = scene.add.text(centerX, previewY - 200, '', futureText(56, '#ffd93c')).setOrigin(0.5);
        this._preview = scene.add.sprite(centerX, previewY, 'sprites').setAngle(-90).setScale(3);
        this._colorText = scene.add.text(centerX, previewY + 190, '', {fontSize: '40px', color: '#fff'}).setOrigin(0.5);
        this.createStatRows(centerX, previewY + 270);
        scene.add.text(centerX, previewY + 520, 'LEFT / RIGHT : design    UP / DOWN : color',
            {fontSize: '28px', color: '#aaa'}).setOrigin(0.5);

        scene.input.keyboard?.on('keydown-LEFT', () => this.changeShip(-1));
        scene.input.keyboard?.on('keydown-RIGHT', () => this.changeShip(1));
        scene.input.keyboard?.on('keydown-UP', () => this.changeColor(-1));
        scene.input.keyboard?.on('keydown-DOWN', () => this.changeColor(1));

        this.applyChoice();
    }

    private createStatRows(centerX: number, startY: number) {
        const ships: PlayerShipData[] = Object.values(this._shipsData);
        const stats: { label: string, read: (ship: PlayerShipData) => number }[] = [
            {label: 'SPEED', read: ship => ship.movementSpeed},
            {label: 'DAMAGE', read: ship => ship.damage},
            {label: 'HEALTH', read: ship => ship.health}
        ];
        const barWidth: number = 360;
        const barX: number = centerX - 60;

        stats.forEach((stat, i) => {
            const y: number = startY + i * 70;
            this._scene.add.text(barX - 30, y, stat.label, futureText(36)).setOrigin(1, 0.5);
            this._scene.add.rectangle(barX, y, barWidth, 28, 0x000000, 0.6).setOrigin(0, 0.5).setStrokeStyle(3, 0xffffff);
            const bar = this._scene.add.rectangle(barX, y, barWidth, 28, 0x5cff7a).setOrigin(0, 0.5);

            this._statRows.push({...stat, bar: bar, max: Math.max(...ships.map(stat.read))});
        });
    }

    private refreshStats(ship: PlayerShipData) {
        this._nameText.setText(ship.name);
        for (const row of this._statRows)
            row.bar.setScale(row.read(ship) / row.max, 1);
    }

    private loadSavedChoice() {
        this._saveManager.load();

        const savedShipId: string = String(this._saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_ID) ?? this._shipIds[0]);
        this._shipIndex = Math.max(0, this._shipIds.indexOf(savedShipId));

        const savedColor: number = Number(this._saveManager.getData(SaveConstants.Keys.PLAYER_SHIP_COLOR) ?? 0);
        this._colorIndex = Phaser.Math.Clamp(savedColor, 0, this._colors.length - 1);
    }

    // Wrap : après le dernier, on revient au premier (et inversement)
    private changeShip(direction: number) {
        this._shipIndex = Phaser.Math.Wrap(this._shipIndex + direction, 0, this._shipIds.length);
        this.applyChoice();
    }

    private changeColor(direction: number) {
        this._colorIndex = Phaser.Math.Wrap(this._colorIndex + direction, 0, this._colors.length);
        this.applyChoice();
    }

    // Met à jour l'aperçu, partage le choix avec le jeu et le sauvegarde
    private applyChoice() {
        const shipId: string = this._shipIds[this._shipIndex];
        const color: ShipColorData = this._colors[this._colorIndex];

        ShipAppearance.apply(this._preview, this._shipsData[shipId], color);
        this._colorText.setText('< ' + color.name + ' >');
        this.refreshStats(this._shipsData[shipId]);

        this._scene.registry.set(RegistryConstants.Keys.PLAYER_SHIP_ID, Number(shipId));
        this._scene.registry.set(RegistryConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);

        this._saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_ID, shipId, false);
        this._saveManager.setData(SaveConstants.Keys.PLAYER_SHIP_COLOR, this._colorIndex);
    }
}
