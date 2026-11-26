import {SineMovementData} from "./SineMovementData.ts";

export type Figure8MovementData = {
    amplitudeX: number;     // Half width of the figure, in pixels
    amplitudeY: number;     // Half height of the figure, in pixels
    frequency: number;      // Full figures per second
}

export type TeleportMovementData = {
    delay: number;          // Time between two teleports, in milliseconds
    fadeDuration: number;   // Time to fade out, then in again, in milliseconds
    marginX: number;        // Minimum distance to the screen sides, in pixels
    rangeY: number;         // Maximum vertical distance from the starting height, in pixels
}

export type DashMovementData = {
    delay: number;          // Time between two dashes, in milliseconds
    speed: number;          // Dash speed, in pixels per millisecond
    amplitude: number;      // Sway around the current position between dashes, in pixels
    frequency: number;      // Sway oscillations per second
}

// Movement of a boss, the type selects the component used
export type BossMovementData =
    | ({ type: 'sine' } & SineMovementData)
    | ({ type: 'figure8' } & Figure8MovementData)
    | ({ type: 'teleport' } & TeleportMovementData)
    | ({ type: 'dash' } & DashMovementData);
