export default class Oscillation {
    // Phase (in radians) of something that oscillates "frequency" times per second, after "elapsedTime" milliseconds
    static getPhase(frequency: number, elapsedTime: number): number {
        return Phaser.Math.PI2 * frequency * (elapsedTime / 1000);
    }
}
