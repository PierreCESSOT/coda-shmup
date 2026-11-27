import {SineMovementData} from "./SineMovementData.ts";

export type Figure8MovementData = {
    amplitudeX: number;     // Half-width of the "8", in pixels
    amplitudeY: number;     // Half-height of the "8", in pixels
    frequency: number;      // Number of complete "8" per second
}

export type TeleportMovementData = {
    delay: number;          // Time between two teleportations, in milliseconds
    fadeDuration: number;   // Duration of the fade (disappearing + reappearing), in milliseconds
    marginX: number;        // Minimum distance to the edges of the screen, in pixels
    rangeY: number;         // Maximum vertical gap with its starting height, in pixels
}

export type DashMovementData = {
    delay: number;          // Time between two dashes, in milliseconds
    speed: number;          // Speed of the dash, in pixels per millisecond
    amplitude: number;      // Sway between two dashes, in pixels
    frequency: number;      // Sways per second
}

// Movement of a boss: "type" chooses the component used
export type BossMovementData =
    | ({ type: 'sine' } & SineMovementData)
    | ({ type: 'figure8' } & Figure8MovementData)
    | ({ type: 'teleport' } & TeleportMovementData)
    | ({ type: 'dash' } & DashMovementData);
