import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

// A movement that follows a pattern around the position the entity had when reset() was called
export default interface IPatternMovement extends IComponent {
    reset(entity: Entity): void;

    move(entity: Entity, deltaTime: number): void;
}
