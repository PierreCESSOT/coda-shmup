import {Display, GameObjects, Geom, Math as PMath} from 'phaser';
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import {FinisherData} from "../gameData/BossesData.ts";

// Laser de fin : maintenir pour charger, lâcher quand c'est plein pour tirer un énorme rayon.
// Désactivé tant que arm() n'a pas été appelé (boss presque mort)
export default class ChargeLaser extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = false;

    public static readonly CHARGE_EVENT: string = 'charge';
    public static readonly FIRE_EVENT: string = 'fire';

    private static readonly BEAM_LENGTH: number = 4000;

    private readonly _data: FinisherData;
    private readonly _color: number;
    private readonly _chargeOrb: GameObjects.Arc;
    private _charge: number = 0;    // De 0 (vide) à 1 (plein)
    private _wasHeld: boolean = false;

    public get beamWidth(): number {
        return this._data.beamWidth;
    }

    public constructor(entity: Entity, data: FinisherData) {
        super();

        this._data = data;
        this._color = Display.Color.HexStringToColor(data.color).color;
        this._chargeOrb = entity.scene.add.circle(entity.x, entity.y, 48, this._color)
            .setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setDepth(10);
    }

    public arm() {
        this.enabled = true;
    }

    public disarm() {
        this.enabled = false;
        this.setCharge(0);
    }

    public update(source: Entity, isHeld: boolean, deltaTime: number) {
        if (!this.enabled)
            return;

        if (isHeld) {
            this.setCharge(this._charge + deltaTime / (this._data.chargeTime * 1000));
        } else if (this._wasHeld) {
            // Touche lâchée : on tire seulement si c'est plein
            if (this._charge >= 1)
                this.fire(source);

            this.setCharge(0);
        }
        this._wasHeld = isHeld;

        // La boule de charge reste sur le nez du vaisseau
        const forward = new PMath.Vector2(1, 0).rotate(source.rotation).scale(source.arcadeBody.radius + 24);
        this._chargeOrb.setPosition(source.x + forward.x, source.y + forward.y);
    }

    private setCharge(charge: number) {
        const previous: number = this._charge;
        this._charge = PMath.Clamp(charge, 0, 1);

        this._chargeOrb.setVisible(this._charge > 0);
        this._chargeOrb.setScale(0.2 + this._charge);
        // Clignote quand c'est plein
        this._chargeOrb.setAlpha(this._charge >= 1 ? 0.6 + 0.4 * Math.sin(Date.now() / 50) : 0.8);

        if (previous !== this._charge)
            this.emit(ChargeLaser.CHARGE_EVENT, this._charge);
    }

    private fire(source: Entity) {
        const scene = source.scene;
        const origin = new PMath.Vector2(this._chargeOrb.x, this._chargeOrb.y);
        const end = new PMath.Vector2(1, 0).rotate(source.rotation).scale(ChargeLaser.BEAM_LENGTH).add(origin);

        // Le rayon : un long rectangle qui part du nez du vaisseau
        const beam = scene.add.rectangle(origin.x, origin.y, ChargeLaser.BEAM_LENGTH, this._data.beamWidth, this._color)
            .setOrigin(0, 0.5).setRotation(source.rotation).setBlendMode(Phaser.BlendModes.ADD).setDepth(10);
        const core = scene.add.rectangle(origin.x, origin.y, ChargeLaser.BEAM_LENGTH, this._data.beamWidth * 0.4, 0xffffff)
            .setOrigin(0, 0.5).setRotation(source.rotation).setDepth(10);

        scene.tweens.add({
            targets: [beam, core],
            scaleY: 0,
            alpha: 0,
            ease: 'Quad.easeIn',
            duration: 600,
            onComplete: () => {
                beam.destroy();
                core.destroy();
            }
        });
        scene.cameras.main.shake(300, 0.02);
        scene.cameras.main.flash(150, 255, 255, 255);

        this.emit(ChargeLaser.FIRE_EVENT, new Geom.Line(origin.x, origin.y, end.x, end.y));
    }
}
