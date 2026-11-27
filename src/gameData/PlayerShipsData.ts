import {ShipBodyData} from "./ShipBodyData.ts";

export type PlayerShipsData = {
    [key: string]: PlayerShipData
}

export type PlayerShipData = {
    name: string;
    movementSpeed: number;      // In pixels per millisecond
    damage: number;             // Damage multiplier of the bullets (1 = normal)
    health: number;             // Health at the start of a game
    texture: string;
    accentTexture: string;      // Only the secondary parts of the ship, in grey: they are the ones that get colored
    body: ShipBodyData;
}
