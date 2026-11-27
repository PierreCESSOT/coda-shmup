import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

// Movement following a pattern (wave, figure 8, teleport...) around the position the entity had on reset()
export default interface IPatternMovement extends IComponent {
    reset(entity: Entity): void;

    move(entity: Entity, deltaTime: number): void;
}
