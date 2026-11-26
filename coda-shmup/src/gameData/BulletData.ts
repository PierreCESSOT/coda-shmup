export type BulletData = {
    width: number;
    height: number;
    color: number;
    speed: number;
    damage: number;
    bossDamageMultiplier?: number;  // Multiplicateur de dégâts contre les boss (1 par défaut)
    piercing?: boolean;             // La balle traverse les ennemis au lieu de s'arrêter au premier
}