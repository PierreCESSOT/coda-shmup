export default class GameConstants {
    public static readonly Events = Object.freeze({
        PLAYER_SPAWNED_EVENT: "playerSpawned",
        ENEMY_SPAWNED_EVENT: "enemySpawned",
        ENEMY_KILLED_EVENT: "enemyKilled",
        BOSS_SPAWNED_EVENT: "bossSpawned",
        BOSS_FINISHER_READY_EVENT: "bossFinisherReady",
        BOSS_KILLED_EVENT: "bossKilled",
    } as const);

    public static readonly SceneKeys = Object.freeze({
        HOME: "HomeScene",
        MAIN_GAME: "MainGameScene",
        MAIN_UI: "MainUIScene",
        GAME_OVER: "GameOverScene",
    } as const);

    // Keys of the JSON files in the Phaser cache
    public static readonly DataKeys = Object.freeze({
        PLAYER_SHIPS: "playerShips",
        ENEMIES: "enemies",
        SHIP_COLORS: "shipColors",
        STREAK: "streak",
        BOSSES: "bosses",
    } as const);

    public static readonly AudioKeys = Object.freeze({
        PLAYER_SHOOT: "sfx_laser1",
        ENEMY_SHOOT: "sfx_laser2",
    } as const);

    public static readonly FontKeys = Object.freeze({
        BITMAP: "future-bmp",
        TRUETYPE: "future",
    } as const);

    // Key of the atlas holding every sprite of the game
    public static readonly ATLAS_KEY: string = "sprites";

    public static readonly MAX_SCORE_DIGITS: number = 6;
}
