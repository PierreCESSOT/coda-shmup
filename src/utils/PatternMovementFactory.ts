import Entity from "../entities/Entity.ts";
import IPatternMovement from "../components/IPatternMovement.ts";
import SineMovement from "../components/SineMovement.ts";
import Figure8Movement from "../components/Figure8Movement.ts";
import TeleportMovement from "../components/TeleportMovement.ts";
import DashMovement from "../components/DashMovement.ts";
import {BossMovementData} from "../gameData/MovementData.ts";

export default class PatternMovementFactory {
    // Creates the movement component matching the "type" of the JSON data
    static create(data: BossMovementData, target: Entity): IPatternMovement {
        switch (data.type) {
            case 'sine':
                return new SineMovement(data);
            case 'figure8':
                return new Figure8Movement(data);
            case 'teleport':
                return new TeleportMovement(data);
            case 'dash':
                return new DashMovement(data, target);
            default:
                throw new Error('Unsupported boss movement type');
        }
    }
}
