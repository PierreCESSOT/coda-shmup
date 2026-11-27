import GameConstants from "../../GameConstants.ts";
import type {PlayerShipData} from "../../gameData/PlayerShipsData.ts";
import type {ShipColorData} from "../../gameData/ShipColorData.ts";
import TitlePalette from "./TitlePalette.ts";
import ChoiceRow from "./ChoiceRow.ts";
import FloatingShip from "./FloatingShip.ts";
import StatBar from "./StatBar.ts";
import FrameScale from "./FrameScale.ts";
import type {TitleContext} from "./FrameScale.ts";

export type PanelActions = {
    changeShip: (direction: number) => void;
    changeColor: (direction: number) => void;
};

// A stat of the ship that is shown as a bar
type StatDefinition = {
    label: string;
    read: (ship: PlayerShipData) => number;
};

type StatRow = {
    read: (ship: PlayerShipData) => number;
    bar: StatBar;
    best: number;           // Best value among all the ships = full bar
};

/**
 * The panel in the middle of the title screen: the name of the ship, the ship itself, the name of the color,
 * and the bars of the stats (speed, damage, health), with the real values of playerShips.json.
 */
export default class ShipPanel {
    // Layout, in frame units
    private static readonly TOP: number = 200;
    private static readonly PADDING_X: number = 18;
    private static readonly PADDING_Y: number = 16;
    private static readonly BORDER: number = 2;
    private static readonly RADIUS: number = 6;
    private static readonly GAP: number = 10;
    private static readonly CONTENT_WIDTH: number = 310;
    private static readonly ROW_HEIGHT: number = 40;
    private static readonly SHIP_BOX: number = 100;
    private static readonly STAT_HEIGHT: number = 18;
    private static readonly STAT_GAP: number = 8;
    private static readonly NAME_ZONE_WIDTH: number = 210;
    private static readonly NAME_FONT_SIZE: number = 26;
    private static readonly COLOR_ZONE_WIDTH: number = 110;
    private static readonly COLOR_FONT_SIZE: number = 15;
    private static readonly BACKGROUND_ALPHA: number = 0.82;
    private static readonly BORDER_ALPHA: number = 0.85;
    private static readonly STATS: StatDefinition[] = [
        {label: 'SPEED', read: ship => ship.movementSpeed},
        {label: 'DAMAGE', read: ship => ship.damage},
        {label: 'HEALTH', read: ship => ship.health}
    ];

    private readonly _shipRow: ChoiceRow;
    private readonly _colorRow: ChoiceRow;
    private readonly _ship: FloatingShip;
    private readonly _statRows: StatRow[] = [];

    public constructor(context: TitleContext, actions: PanelActions, ships: PlayerShipData[]) {
        const {GAP, ROW_HEIGHT, SHIP_BOX, TOP, BORDER, PADDING_Y} = ShipPanel;
        const centerX: number = FrameScale.FRAME_WIDTH / 2;
        const shipRowY: number = TOP + BORDER + PADDING_Y + ROW_HEIGHT / 2;
        const shipY: number = shipRowY + ROW_HEIGHT / 2 + GAP + SHIP_BOX / 2;
        const colorRowY: number = shipY + SHIP_BOX / 2 + GAP + ROW_HEIGHT / 2;
        const statsTop: number = colorRowY + ROW_HEIGHT / 2 + GAP;

        this.createBackground(context);
        this._shipRow = new ChoiceRow(context, {
            centerX, centerY: shipRowY, labelWidth: ShipPanel.NAME_ZONE_WIDTH, fontFamily: GameConstants.FontKeys.AUDIOWIDE,
            fontSize: ShipPanel.NAME_FONT_SIZE, color: TitlePalette.HIGHLIGHT,
            onPrevious: () => actions.changeShip(-1), onNext: () => actions.changeShip(1)
        });
        this._ship = new FloatingShip(context, {x: centerX, y: shipY, boxSize: SHIP_BOX});
        this._colorRow = new ChoiceRow(context, {
            centerX, centerY: colorRowY, labelWidth: ShipPanel.COLOR_ZONE_WIDTH, fontFamily: GameConstants.FontKeys.SPACE_MONO,
            fontSize: ShipPanel.COLOR_FONT_SIZE, color: TitlePalette.TEXT,
            onPrevious: () => actions.changeColor(-1), onNext: () => actions.changeColor(1)
        });
        this.createStatRows(context, ships, statsTop);
    }

    public show(ship: PlayerShipData, color: ShipColorData) {
        this._shipRow.setText(ship.name);
        this._colorRow.setText(color.name);
        this._ship.show(ship, color);

        for (const row of this._statRows) {
            const value: number = row.read(ship);
            row.bar.setValue(String(value), value / row.best);
        }
    }

    // Dark rounded box with a thin white border, whose size comes from its content
    private createBackground({scene, scale}: TitleContext) {
        const {CONTENT_WIDTH, PADDING_X, PADDING_Y, BORDER, TOP, RADIUS, GAP, ROW_HEIGHT, SHIP_BOX, STAT_HEIGHT, STAT_GAP} = ShipPanel;
        const statsHeight: number = ShipPanel.STATS.length * STAT_HEIGHT + (ShipPanel.STATS.length - 1) * STAT_GAP;
        const contentHeight: number = ROW_HEIGHT * 2 + SHIP_BOX + statsHeight + GAP * 3;

        const width: number = CONTENT_WIDTH + (PADDING_X + BORDER) * 2;
        const height: number = contentHeight + (PADDING_Y + BORDER) * 2;
        const left: number = (FrameScale.FRAME_WIDTH - width) / 2;

        const box = scene.add.graphics();
        box.fillStyle(TitlePalette.PANEL_BACKGROUND, ShipPanel.BACKGROUND_ALPHA);
        box.fillRoundedRect(scale.px(left), scale.px(TOP), scale.px(width), scale.px(height), scale.px(RADIUS));

        // The border is drawn inside the box: the line is centered on a path moved in by half of its thickness
        const inset: number = BORDER / 2;
        box.lineStyle(scale.px(BORDER), TitlePalette.WHITE, ShipPanel.BORDER_ALPHA);
        box.strokeRoundedRect(scale.px(left + inset), scale.px(TOP + inset), scale.px(width - BORDER), scale.px(height - BORDER),
            scale.px(RADIUS));
    }

    private createStatRows(context: TitleContext, ships: PlayerShipData[], top: number) {
        const left: number = (FrameScale.FRAME_WIDTH - ShipPanel.CONTENT_WIDTH) / 2;

        ShipPanel.STATS.forEach((stat, index) => {
            const centerY: number = top + index * (ShipPanel.STAT_HEIGHT + ShipPanel.STAT_GAP) + ShipPanel.STAT_HEIGHT / 2;
            const bar = new StatBar(context, {label: stat.label, left, centerY, width: ShipPanel.CONTENT_WIDTH});

            this._statRows.push({read: stat.read, bar, best: Math.max(...ships.map(stat.read))});
        });
    }
}
