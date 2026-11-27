import {Types} from 'phaser';
import GameConstants from "../GameConstants.ts";

const OUTLINE_COLOR: string = '#000000';
const OUTLINE_THICKNESS: number = 6;

// Text style of the game (font "future"). The bitmap font only contains digits and 'x':
// to write words, this TTF version is used
export function futureText(fontSize: number, color: string = '#ffffff'): Types.GameObjects.Text.TextStyle {
    return {fontSize: fontSize + 'px', color, fontFamily: GameConstants.FontKeys.TRUETYPE};
}

// Same as futureText, with a black outline to stay readable over any background
export function outlinedFutureText(fontSize: number, color: string = '#ffffff'): Types.GameObjects.Text.TextStyle {
    return {...futureText(fontSize, color), stroke: OUTLINE_COLOR, strokeThickness: OUTLINE_THICKNESS};
}
