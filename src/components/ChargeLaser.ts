import {Display, GameObjects, Geom, Math as PMath, Scene} from 'phaser';
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import {FinisherData} from "../gameData/BossesData.ts";

// Hold to charge, release when full to fire a huge laser beam. Disabled until arm() is called
export default class ChargeLaser extends Phaser.Events.EventEmitter implements IComponent {
    public enabled: boolean = false;

    public static readonly CHARGE_EVENT: string = 'charge';
    public static readonly FIRE_EVENT: string = 'fire';

    private static readonly FULL_CHARGE: number = 1;
    private static readonly BEAM_LENGTH: number = 4000;
    private static readonly BEAM_CORE_COLOR: number = 0xffffff;
    private static readonly BEAM_CORE_WIDTH_RATIO: number = 0.4;
    private static readonly BEAM_FADE_DURATION: number = 600;
    private static readonly EFFECTS_DEPTH: number = 10;
    private static readonly ORB_RADIUS: number = 48;
    private static readonly ORB_DISTANCE_FROM_BODY: number = 24;
    private static readonly ORB_MIN_SCALE: number = 0.2;
    private static readonly ORB_CHARGING_ALPHA: number = 0.8;
    private static readonly ORB_BLINK_BASE_ALPHA: number = 0.6;
    private static readonly ORB_BLINK_AMPLITUDE: number = 0.4;
    private static readonly ORB_BLINK_PERIOD_DIVISOR: number = 50;
    private static readonly FIRE_SHAKE_DURATION: number = 300;
    private static readonly FIRE_SHAKE_INTENSITY: number = 0.02;
    private static readonly FIRE_FLASH_DURATION: number = 150;

    private readonly _data: FinisherData;
    private readonly _color: number;
    private readonly _chargeOrb: GameObjects.Arc;
    private _charge: number = 0;    // From 0 to FULL_CHARGE
    private _wasHeld: boolean = false;

    public get beamWidth(): number {
        return this._data.beamWidth;
    }

    public constructor(entity: Entity, data: FinisherData) {
        super();

        this._data = data;
        this._color = Display.Color.HexStringToColor(data.color).color;
        this._chargeOrb = entity.scene.add.circle(entity.x, entity.y, ChargeLaser.ORB_RADIUS, this._color)
            .setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setDepth(ChargeLaser.EFFECTS_DEPTH);
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

        this.updateCharge(source, isHeld, deltaTime);
        this.placeOrbOnShipNose(source);
    }

    private static getForward(rotation: number): PMath.Vector2 {
        return new PMath.Vector2(1, 0).rotate(rotation);
    }

    private updateCharge(source: Entity, isHeld: boolean, deltaTime: number) {
        if (isHeld) {
            this.setCharge(this._charge + deltaTime / (this._data.chargeTime * 1000));
        } else if (this._wasHeld) {
            // Released: fire only if fully charged
            if (this._charge >= ChargeLaser.FULL_CHARGE)
                this.fire(source);

            this.setCharge(0);
        }
        this._wasHeld = isHeld;
    }

    private placeOrbOnShipNose(source: Entity) {
        const nose = ChargeLaser.getForward(source.rotation)
            .scale(source.arcadeBody.radius + ChargeLaser.ORB_DISTANCE_FROM_BODY);
        this._chargeOrb.setPosition(source.x + nose.x, source.y + nose.y);
    }

    private setCharge(charge: number) {
        const previous: number = this._charge;
        this._charge = PMath.Clamp(charge, 0, ChargeLaser.FULL_CHARGE);

        this._chargeOrb.setVisible(this._charge > 0);
        this._chargeOrb.setScale(ChargeLaser.ORB_MIN_SCALE + this._charge);
        this._chargeOrb.setAlpha(this._charge >= ChargeLaser.FULL_CHARGE ? this.getBlinkingAlpha() : ChargeLaser.ORB_CHARGING_ALPHA);

        if (previous !== this._charge)
            this.emit(ChargeLaser.CHARGE_EVENT, this._charge);
    }

    // Blink once fully charged
    private getBlinkingAlpha(): number {
        return ChargeLaser.ORB_BLINK_BASE_ALPHA
            + ChargeLaser.ORB_BLINK_AMPLITUDE * Math.sin(Date.now() / ChargeLaser.ORB_BLINK_PERIOD_DIVISOR);
    }

    private fire(source: Entity) {
        const origin = new PMath.Vector2(this._chargeOrb.x, this._chargeOrb.y);
        const end = ChargeLaser.getForward(source.rotation).scale(ChargeLaser.BEAM_LENGTH).add(origin);

        this.showBeam(source.scene, origin, source.rotation);
        this.shakeAndFlashCamera(source.scene);

        this.emit(ChargeLaser.FIRE_EVENT, new Geom.Line(origin.x, origin.y, end.x, end.y));
    }

    // Beam visual: a long rectangle starting at the nose of the ship, with a thinner white core
    private showBeam(scene: Scene, origin: PMath.Vector2, rotation: number) {
        const beam = scene.add.rectangle(origin.x, origin.y, ChargeLaser.BEAM_LENGTH, this._data.beamWidth, this._color)
            .setOrigin(0, 0.5).setRotation(rotation).setBlendMode(Phaser.BlendModes.ADD).setDepth(ChargeLaser.EFFECTS_DEPTH);
        const core = scene.add.rectangle(origin.x, origin.y, ChargeLaser.BEAM_LENGTH,
            this._data.beamWidth * ChargeLaser.BEAM_CORE_WIDTH_RATIO, ChargeLaser.BEAM_CORE_COLOR)
            .setOrigin(0, 0.5).setRotation(rotation).setDepth(ChargeLaser.EFFECTS_DEPTH);

        scene.tweens.add({
            targets: [beam, core],
            scaleY: 0,
            alpha: 0,
            ease: 'Quad.easeIn',
            duration: ChargeLaser.BEAM_FADE_DURATION,
            onComplete: () => {
                beam.destroy();
                core.destroy();
            }
        });
    }

    private shakeAndFlashCamera(scene: Scene) {
        scene.cameras.main.shake(ChargeLaser.FIRE_SHAKE_DURATION, ChargeLaser.FIRE_SHAKE_INTENSITY);
        scene.cameras.main.flash(ChargeLaser.FIRE_FLASH_DURATION, 255, 255, 255);
    }
}
