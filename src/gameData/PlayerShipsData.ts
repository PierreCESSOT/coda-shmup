import {ShipBodyData} from "./ShipBodyData.ts";

export type PlayerShipsData = {
    [key: string]: PlayerShipData
}

export type PlayerShipData = {
    movementSpeed: number;
    texture: string;
    tintableTexture: string;   // Greyscale version of the texture, used when a color is chosen
    body: ShipBodyData;
}