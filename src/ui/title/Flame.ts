import {Scene} from "phaser";
import type {TitleContext} from "./FrameScale.ts";

export type FlameSetup = {
    x: number;              // Center of the top of the flame, in frame units
    top: number;
};

// The flame of the engine under the small ship: a yellow line that fades out and pulses
export default class Flame {
    private static readonly TEXTURE_KEY: string = 'titleFlame';
    private static readonly TEXTURE_WIDTH: number = 16;
    private static readonly TEXTURE_HEIGHT: number = 64;
    private static readonly TOP_COLOR: string = '#ffd23f';
    private static readonly BOTTOM_COLOR: string = 'rgba(255, 120, 60, 0)';
    private static readonly WIDTH: number = 8;
    private static readonly MIN_HEIGHT: number = 10;
    private static readonly MAX_HEIGHT: number = 18;
    private static readonly MIN_ALPHA: number = 0.8;
    private static readonly PULSE_DURATION: number = 125;

    public constructor({scene, scale}: TitleContext, setup: FlameSetup) {
        Flame.createTexture(scene);

        const flame = scene.add.image(scale.px(setup.x), scale.px(setup.top), Flame.TEXTURE_KEY)
            .setOrigin(0.5, 0)
            .setDisplaySize(scale.px(Flame.WIDTH), scale.px(Flame.MIN_HEIGHT))
            .setAlpha(Flame.MIN_ALPHA);

        // A pulse is the flame growing then shrinking: each way takes half of the period
        scene.tweens.add({
            targets: flame,
            displayHeight: scale.px(Flame.MAX_HEIGHT),
            alpha: 1,
            duration: Flame.PULSE_DURATION,
            yoyo: true,
            repeat: -1
        });
    }

    // A vertical gradient from yellow to transparent, drawn once
    private static createTexture(scene: Scene) {
        if (scene.textures.exists(Flame.TEXTURE_KEY))
            return;

        const texture = scene.textures.createCanvas(Flame.TEXTURE_KEY, Flame.TEXTURE_WIDTH, Flame.TEXTURE_HEIGHT);
        const context = texture?.getContext();
        if (!texture || !context)
            return;

        const gradient = context.createLinearGradient(0, 0, 0, Flame.TEXTURE_HEIGHT);
        gradient.addColorStop(0, Flame.TOP_COLOR);
        gradient.addColorStop(1, Flame.BOTTOM_COLOR);

        context.fillStyle = gradient;
        context.beginPath();
        // Rounded ends, when the browser can draw them (older browsers get square ends)
        if (context.roundRect)
            context.roundRect(0, 0, Flame.TEXTURE_WIDTH, Flame.TEXTURE_HEIGHT, Flame.TEXTURE_WIDTH / 2);
        else
            context.rect(0, 0, Flame.TEXTURE_WIDTH, Flame.TEXTURE_HEIGHT);
        context.fill();
        texture.refresh();
    }
}
