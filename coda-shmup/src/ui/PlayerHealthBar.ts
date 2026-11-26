import {GameObjects, Scene} from 'phaser';
import Health from "../components/Health.ts";
import {futureText} from "./TextStyles.ts";

/**
 * Barre de PV du joueur, en haut à gauche : "73 / 100".
 * Verte, puis jaune sous 50 %, puis rouge sous 25 %.
 * Le bouclier d'un bonus (PV temporaires) s'ajoute en bleu au bout de la barre : "73 / 100 +50".
 * Affiche aussi un petit texte quand le joueur gagne des PV ou des PV max.
 */
export default class PlayerHealthBar {
    private static readonly WIDTH: number = 420;
    private static readonly HEIGHT: number = 40;

    private readonly _scene: Scene;
    private readonly _bar: GameObjects.Rectangle;
    private readonly _shieldBar: GameObjects.Rectangle;
    private readonly _text: GameObjects.Text;

    public constructor(scene: Scene) {
        this._scene = scene;

        const icon = scene.add.image(64, 64, "sprites", "playerLife1_blue").setOrigin(0, 0).setScale(1.5);
        const x: number = icon.x + icon.displayWidth + 24;
        const y: number = icon.y + icon.displayHeight / 2;

        // Fond noir, barre colorée par-dessus, texte au milieu
        scene.add.rectangle(x, y, PlayerHealthBar.WIDTH, PlayerHealthBar.HEIGHT, 0x000000, 0.6)
            .setOrigin(0, 0.5).setStrokeStyle(4, 0xffffff);
        this._bar = scene.add.rectangle(x, y, PlayerHealthBar.WIDTH, PlayerHealthBar.HEIGHT, 0x5cff7a)
            .setOrigin(0, 0.5);
        this._shieldBar = scene.add.rectangle(x, y, PlayerHealthBar.WIDTH, PlayerHealthBar.HEIGHT, 0x4de8ff)
            .setOrigin(0, 0.5).setScale(0, 1);
        this._text = scene.add.text(x + PlayerHealthBar.WIDTH / 2, y, "", futureText(32, '#ffffff', true))
            .setOrigin(0.5);
    }

    // Suit la vie du joueur
    public bind(health: Health) {
        this.refresh(health);

        health.on(Health.CHANGE_EVENT, (current: number, previous: number) => {
            this.refresh(health);
            // Pas de texte pour les tout petits soins (ex : +0.25 par ennemi éliminé)
            if (current - previous >= 1)
                this.showPopup("+" + Math.round(current - previous) + " HP", '#5cff7a', 0);
        });

        health.on(Health.SHIELD_CHANGE_EVENT, (shield: number, previous: number) => {
            this.refresh(health);
            if (shield > previous)
                this.showPopup("SHIELD +" + Math.round(shield - previous), '#4de8ff', 0);
        });

        health.on(Health.MAX_CHANGE_EVENT, (max: number, previous: number) => {
            this.refresh(health);
            this.showPopup("MAX HP +" + Math.round(max - previous), '#ffd93c', 56);
        });
    }

    private refresh(health: Health) {
        const ratio: number = health.current / health.max;
        this._bar.setScale(ratio, 1);
        this._bar.setFillStyle(ratio > 0.5 ? 0x5cff7a : ratio > 0.25 ? 0xffd93c : 0xff5050);
        // Le bouclier commence où la vie s'arrête, sans dépasser le bout de la barre
        const shieldRatio: number = Math.min(health.shield / health.max, 1 - ratio);
        this._shieldBar.setX(this._bar.x + ratio * PlayerHealthBar.WIDTH).setScale(shieldRatio, 1);

        const shieldText: string = health.shield > 0 ? "  +" + Math.ceil(health.shield) : "";
        this._text.setText(Math.ceil(health.current) + " / " + health.max + shieldText);
    }

    // Texte qui descend sous la barre en disparaissant
    private showPopup(text: string, color: string, offsetY: number) {
        const popup = this._scene.add.text(this._text.x, this._text.y + 48 + offsetY, text, futureText(44, color, true))
            .setOrigin(0.5);

        this._scene.tweens.add({
            targets: popup,
            y: popup.y + 60,
            alpha: {from: 1, to: 0},
            ease: 'Quad.easeOut',
            duration: 1500,
            onComplete: () => popup.destroy()
        });
    }
}
