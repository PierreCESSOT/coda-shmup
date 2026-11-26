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

    public static readonly MAX_SCORE_DIGITS: number = 6;
}