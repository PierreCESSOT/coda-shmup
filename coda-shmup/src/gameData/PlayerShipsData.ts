import {ShipBodyData} from "./ShipBodyData.ts";

export type PlayerShipsData = {
    [key: string]: PlayerShipData
}

export type PlayerShipData = {
    name: string;
    movementSpeed: number;      // En pixels par milliseconde
    damage: number;             // Multiplicateur de dégâts des tirs (1 = normal)
    health: number;             // PV au début d'une partie
    texture: string;
    accentTexture: string;      // Uniquement les parties secondaires du vaisseau, en gris : c'est elles qu'on colore
    body: ShipBodyData;
}
