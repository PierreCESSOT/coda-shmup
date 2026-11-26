import {SineMovementData} from "./SineMovementData.ts";

export type Figure8MovementData = {
    amplitudeX: number;     // Demi-largeur du "8", en pixels
    amplitudeY: number;     // Demi-hauteur du "8", en pixels
    frequency: number;      // Nombre de "8" complets par seconde
}

export type TeleportMovementData = {
    delay: number;          // Temps entre deux téléportations, en millisecondes
    fadeDuration: number;   // Durée du fondu (disparition + réapparition), en millisecondes
    marginX: number;        // Distance minimum aux bords de l'écran, en pixels
    rangeY: number;         // Écart vertical maximum avec sa hauteur de départ, en pixels
}

export type DashMovementData = {
    delay: number;          // Temps entre deux charges, en millisecondes
    speed: number;          // Vitesse de la charge, en pixels par milliseconde
    amplitude: number;      // Balancement entre deux charges, en pixels
    frequency: number;      // Balancements par seconde
}

// Mouvement d'un boss : "type" choisit le composant utilisé
export type BossMovementData =
    | ({ type: 'sine' } & SineMovementData)
    | ({ type: 'figure8' } & Figure8MovementData)
    | ({ type: 'teleport' } & TeleportMovementData)
    | ({ type: 'dash' } & DashMovementData);
