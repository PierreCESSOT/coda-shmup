import {Types} from 'phaser';

// Style de texte du jeu (police "future"). La police bitmap ne contient que des chiffres et 'x' :
// pour écrire des mots, on utilise cette version TTF
export function futureText(fontSize: number, color: string = '#ffffff', outlined: boolean = false): Types.GameObjects.Text.TextStyle {
    return {
        fontSize: fontSize + 'px',
        color: color,
        fontFamily: 'future',
        stroke: outlined ? '#000000' : undefined,
        strokeThickness: outlined ? 6 : 0
    };
}
