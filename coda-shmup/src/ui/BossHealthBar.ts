import {GameObjects, Scene} from 'phaser';
import Health from "../components/Health.ts";
import Boss from "../entities/Boss.ts";
import {futureText} from "./TextStyles.ts";

/**
 * Barre de vie du boss, en haut de l'écran, avec son nom (en doré pour un boss ultra).
 * Quand le boss est presque mort, la barre devient rose et le message "HOLD F..." clignote en bas.
 */
export default class BossHealthBar {
    private static readonly COLOR: number = 0xff5050;
    private static readonly ULTRA_COLOR: number = 0xff9a3c;
    private static readonly FINISHER_COLOR: number = 0xff4dff;

    private readonly _scene: Scene;
    private readonly _nameText: GameObjects.Text;
    private readonly _background: GameObjects.Rectangle;
    private readonly _bar: GameObjects.Rectangle;
    private readonly _finisherHint: GameObjects.Text;

    public constructor(scene: Scene) {
        this._scene = scene;

        const centerX: number = scene.scale.width / 2;
        const width: number = scene.scale.width - 256;

        this._nameText = scene.add.text(centerX, 300, "", futureText(48)).setOrigin(0.5);
        this._background = scene.add.rectangle(centerX, 360, width, 32, 0x000000, 0.6).setStrokeStyle(4, 0xffffff);
        this._bar = scene.add.rectangle(centerX - width / 2, 360, width, 32, BossHealthBar.COLOR).setOrigin(0, 0.5);
        this._finisherHint = scene.add.text(centerX, scene.scale.height - 360, "HOLD F TO CHARGE THE LASER!",
            futureText(48, '#ff4dff')).setOrigin(0.5);

        this.hide();
    }

    public show(boss: Boss) {
        this._nameText.setText(boss.isUltra ? "ULTRA - " + boss.bossName : boss.bossName);
        this._nameText.setColor(boss.isUltra ? '#ffd93c' : '#ffffff');
        this._bar.setScale(1, 1).setFillStyle(boss.isUltra ? BossHealthBar.ULTRA_COLOR : BossHealthBar.COLOR);
        this.setVisible(true);

        const health = boss.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, (current: number) => this._bar.setScale(current / health.max, 1));
    }

    public showFinisherHint() {
        this._bar.setFillStyle(BossHealthBar.FINISHER_COLOR);
        this._finisherHint.setVisible(true).setAlpha(1);

        // Clignote jusqu'à la mort du boss
        this._scene.tweens.add({
            targets: this._finisherHint,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 400
        });
    }

    public hide() {
        this.setVisible(false);
        this._scene.tweens.killTweensOf(this._finisherHint);
        this._finisherHint.setVisible(false);
    }

    private setVisible(visible: boolean) {
        this._nameText.setVisible(visible);
        this._background.setVisible(visible);
        this._bar.setVisible(visible);
    }
}
