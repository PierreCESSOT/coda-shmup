import {Types} from "phaser";

export default class TitlePalette {
    public static readonly BACKGROUND: number = 0x3a2e3f;
    public static readonly STAR: string = '#6e5c76';
    public static readonly TEXT: string = '#ffffff';
    public static readonly WHITE: number = 0xffffff;
    public static readonly HIGHLIGHT: string = '#ffd23f';      // Ship name, hovered arrows
    public static readonly BAR_FILL: number = 0x5cf06a;        // Same green as the health bar of the game
    public static readonly BAR_LABEL: string = '#1d1622';
    public static readonly PANEL_BACKGROUND: number = 0x241c29;
}

// Style of a text of the title screen, with its size already converted to the resolution of the game
export function titleText(fontFamily: string, fontSize: number, color: string = TitlePalette.TEXT): Types.GameObjects.Text.TextStyle {
    return {fontFamily, fontSize: fontSize + 'px', color};
}
