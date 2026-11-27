import {Scene} from "phaser";
import SaveManager from "../../managers/SaveManager.ts";
import GameConstants from "../../GameConstants.ts";
import TitlePalette, {titleText} from "./TitlePalette.ts";
import FrameScale from "./FrameScale.ts";
import type {TitleContext} from "./FrameScale.ts";
import StarField from "./StarField.ts";
import ShipPanel from "./ShipPanel.ts";
import FloatingShip from "./FloatingShip.ts";
import Flame from "./Flame.ts";
import ShipSelection from "./ShipSelection.ts";

/**
 * The title screen: the title, a planet and twinkling stars, the panel to choose the ship (design with
 * left / right, color with up / down), and "Press SPACE to start".
 * A small copy of the chosen ship, with its engine flame, reminds the position of the player in the game.
 *
 * Starting the game is up to the scene: this screen only keeps the choice (see ShipSelection).
 */
export default class TitleScreen {
    // Layout, in frame units (see FrameScale)
    private static readonly PLANET_TEXTURE: string = 'planet';
    // The planet is placed by its sphere (the visible part), which goes out of the screen by the top right corner
    private static readonly PLANET_CENTER_X: number = 370;
    private static readonly PLANET_CENTER_Y: number = 50;
    private static readonly PLANET_DIAMETER: number = 240;
    private static readonly PLANET_SPHERE_SHARE: number = 0.817;   // Share of planet00.png that is filled by the sphere
    private static readonly PLANET_GLOW_COLOR: number = 0xa0d2ff;
    private static readonly PLANET_GLOW_STRENGTH: number = 4;
    private static readonly PLANET_GLOW_PADDING: number = 16;
    private static readonly TITLE_X: number = 28;
    private static readonly TITLE_Y: number = 40;
    private static readonly TITLE_FONT_SIZE: number = 40;
    private static readonly TITLE_LINE_HEIGHT: number = 40;
    private static readonly TITLE_GLOW_COLOR: string = 'rgba(255, 255, 255, 0.3)';
    private static readonly TITLE_GLOW_BLUR: number = 16;
    private static readonly START_Y: number = 600;
    private static readonly START_FONT_SIZE: number = 15;
    private static readonly START_BLINK_PERIOD: number = 1300;
    private static readonly START_VISIBLE_RATIO: number = 0.6;
    private static readonly START_DIMMED_ALPHA: number = 0.2;
    private static readonly MINI_SHIP_TOP: number = 650;
    private static readonly MINI_SHIP_SIZE: number = 60;

    private readonly _selection: ShipSelection;
    private readonly _panel: ShipPanel;
    private readonly _miniShip: FloatingShip;

    public constructor(scene: Scene, saveManager: SaveManager) {
        const context: TitleContext = {scene, scale: new FrameScale(scene.scale.width)};
        const centerX: number = FrameScale.FRAME_WIDTH / 2;

        this._selection = new ShipSelection(scene, saveManager);

        // From the back to the front
        scene.cameras.main.setBackgroundColor(TitlePalette.BACKGROUND);
        new StarField(context);
        this.createPlanet(context);
        this.createTitle(context);
        this._panel = new ShipPanel(context, {
            changeShip: direction => this.changeShip(direction),
            changeColor: direction => this.changeColor(direction)
        }, this._selection.ships);
        this.createPressStart(context);
        this._miniShip = new FloatingShip(context, {
            x: centerX, y: TitleScreen.MINI_SHIP_TOP + TitleScreen.MINI_SHIP_SIZE / 2, boxSize: TitleScreen.MINI_SHIP_SIZE
        });
        new Flame(context, {x: centerX, top: TitleScreen.MINI_SHIP_TOP + TitleScreen.MINI_SHIP_SIZE});

        this.bindKeys(scene);
        this.refresh();
    }

    private changeShip(direction: number) {
        this._selection.changeShip(direction);
        this.refresh();
    }

    private changeColor(direction: number) {
        this._selection.changeColor(direction);
        this.refresh();
    }

    // Shows the current choice everywhere
    private refresh() {
        const {ship, color} = this._selection;

        this._panel.show(ship, color);
        this._miniShip.show(ship, color);
    }

    private bindKeys(scene: Scene) {
        const keyboard = scene.input.keyboard;
        keyboard?.on('keydown-LEFT', () => this.changeShip(-1));
        keyboard?.on('keydown-RIGHT', () => this.changeShip(1));
        keyboard?.on('keydown-UP', () => this.changeColor(-1));
        keyboard?.on('keydown-DOWN', () => this.changeColor(1));
    }

    private createPlanet({scene, scale}: TitleContext) {
        const imageSize: number = TitleScreen.PLANET_DIAMETER / TitleScreen.PLANET_SPHERE_SHARE;
        const planet = scene.add.image(scale.px(TitleScreen.PLANET_CENTER_X), scale.px(TitleScreen.PLANET_CENTER_Y),
            TitleScreen.PLANET_TEXTURE).setDisplaySize(scale.px(imageSize), scale.px(imageSize));

        // The glow only exists with the WebGL renderer, hence the "?."
        planet.preFX?.setPadding(scale.px(TitleScreen.PLANET_GLOW_PADDING));
        planet.preFX?.addGlow(TitleScreen.PLANET_GLOW_COLOR, TitleScreen.PLANET_GLOW_STRENGTH);
    }

    // Two lines whose height is exactly the line height of the design (the font has extra space around its letters)
    private createTitle({scene, scale}: TitleContext) {
        const lineHeight: number = scale.px(TitleScreen.TITLE_LINE_HEIGHT);
        const title = scene.add.text(scale.px(TitleScreen.TITLE_X), scale.px(TitleScreen.TITLE_Y), 'CODA\nSHMUP',
            titleText(GameConstants.FontKeys.AUDIOWIDE, scale.px(TitleScreen.TITLE_FONT_SIZE)))
            .setShadow(0, 0, TitleScreen.TITLE_GLOW_COLOR, scale.px(TitleScreen.TITLE_GLOW_BLUR), false, true);

        const extraSpace: number = title.getTextMetrics().fontSize - lineHeight;
        title.setLineSpacing(-extraSpace);
        title.y -= extraSpace / 2;
    }

    // The text is fully visible for most of the period, then dimmed for the rest of it
    private createPressStart({scene, scale}: TitleContext) {
        const text = scene.add.text(scale.px(FrameScale.FRAME_WIDTH / 2), scale.px(TitleScreen.START_Y), 'Press SPACE to start',
            titleText(GameConstants.FontKeys.SPACE_MONO, scale.px(TitleScreen.START_FONT_SIZE))).setOrigin(0.5, 0);

        const visibleDuration: number = TitleScreen.START_BLINK_PERIOD * TitleScreen.START_VISIBLE_RATIO;
        const blink = () => {
            text.setAlpha(1);
            scene.time.delayedCall(visibleDuration, () => text.setAlpha(TitleScreen.START_DIMMED_ALPHA));
        };

        blink();
        scene.time.addEvent({delay: TitleScreen.START_BLINK_PERIOD, loop: true, callback: blink});
    }
}
