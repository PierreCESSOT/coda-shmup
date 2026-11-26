import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

// Un mouvement qui suit un motif (vague, 8, téléportation...) autour de la position qu'avait l'entité lors de reset()
export default interface IPatternMovement extends IComponent {
    reset(entity: Entity): void;

    move(entity: Entity, deltaTime: number): void;
}
