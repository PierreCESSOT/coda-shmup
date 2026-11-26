export default class SaveConstants {
    public static readonly Keys = Object.freeze({
        PLAYER_BEST_SCORE: 'playerBestScore',
        PLAYER_SHIP_ID: 'playerShipId',
        PLAYER_SHIP_COLOR: 'playerShipColor'
    } as const);
}