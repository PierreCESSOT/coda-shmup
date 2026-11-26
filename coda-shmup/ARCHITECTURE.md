# Architecture du jeu

Ce document explique comment le code est organisé, pour s'y retrouver vite.

## L'idée générale : des Lego

Le jeu est construit en **Entity / Component** :

- une **entité** (`entities/`) est un objet du jeu : le joueur, un ennemi, un boss, une balle ;
- un **composant** (`components/`) est une capacité qu'on branche sur une entité : de la vie, un mouvement, une arme.

Pour créer un nouvel ennemi, on assemble des composants qui existent déjà au lieu de tout réécrire.
Exemple : le `SineEnemy` = `Health` + `SineMovement` + `SpreadWeapon`.

Les réglages (vie, vitesse, attaques...) ne sont **pas dans le code** mais dans des fichiers JSON
(`public/assets/Data/`). On peut équilibrer le jeu sans toucher au TypeScript.

## Les dossiers

| Dossier | Contenu |
|---|---|
| `scenes/` | Les écrans : accueil, jeu, interface (par-dessus le jeu), game over |
| `entities/` | Les objets du jeu : `Player`, `Enemy` (UFO rouge), `SineEnemy`, `Boss`, `Bullet`, `PowerUp` (bonus qui tombe) |
| `components/` | Les capacités : vie, mouvements, armes, bonus actif, laser chargé |
| `managers/` | Ceux qui créent et relient les entités : `EntityManager`, `BossDirector`, `PowerUpSpawner`, `SaveManager` |
| `ui/` | Les morceaux d'interface : barres de vie, bonus actif, menu du vaisseau |
| `gameData/` | Les **types** des fichiers JSON (la forme attendue de chaque fichier) |
| `effects/` | Effets visuels qui agissent sur le jeu : l'onde de choc (`Shockwave`) |
| `utils/` | Petits outils : apparence du vaisseau, choix du mouvement d'un boss |

## Qui fait quoi

```
HomeScene ── charge les images, sons et JSON, affiche le menu du vaisseau
   │ (Espace)
   ▼
MainGameScene ── lance la partie
   │
   └── EntityManager ── crée le joueur, les ennemis, gère les collisions
          │
          ├── BossDirector ── fait apparaître les boss, gère le laser de fin et les récompenses
          └── PowerUpSpawner ── fait tomber des bonus quand un ennemi meurt, et les donne au joueur

MainUIScene ── affichée par-dessus, écoute les événements et met à jour les widgets de ui/
```

### Les entités

- **`BaseEnemy`** : ce que tous les ennemis partagent (flash blanc quand touché, pooling, sortie d'écran).
  Chaque ennemi n'écrit que son `move()` et éventuellement son `shoot()`.
- **`Enemy`** : l'UFO rouge du cours.
- **`SineEnemy`** : l'ennemi de l'évaluation (zigzag + éventail).
- **`Boss`** : entre en scène, bouge, attaque, et devient invulnérable aux balles quand il est presque mort.
- **`Player`** : bouge, tire, profite du bonus ramassé, charge le laser de fin. Ses stats (vitesse, dégâts, PV)
  viennent du vaisseau choisi.
- **`PowerUp`** : un bonus qui tombe ; le joueur doit passer dessus pour le ramasser, sinon il est perdu.

### Les composants

| Composant | Rôle |
|---|---|
| `Health` | Points de vie, PV max, bouclier (PV temporaires), événements `change` / `death` / `maxChange` / `shieldChange` / `hit` |
| `Movement` | Déplacement simple (joueur, UFO rouge) |
| `SineMovement` | Zigzag (vague) |
| `Figure8Movement` | Dessine un « 8 » |
| `TeleportMovement` | Disparaît et réapparaît ailleurs |
| `DashMovement` | Se balance, puis fonce vers le joueur |
| `Weapon` | Tire une balle devant soi |
| `SpreadWeapon` | Tire un éventail de balles (hérite de `Weapon`) |
| `BossAttackSequence` | Enchaîne les attaques d'un boss dans l'ordre du JSON |
| `PowerUpSlot` | Le bonus actif du joueur, son compte à rebours et son niveau (un seul bonus à la fois) |
| `ChargeLaser` | Laser de fin à charger (touche F) |

Les 4 mouvements de boss respectent la même interface `IPatternMovement` (`reset()` + `move()`).
`PatternMovementFactory` choisit le bon selon le `"type"` écrit dans `bosses.json`.

## Comment les morceaux se parlent : les événements

Les entités ne s'appellent pas directement : elles **émettent des événements**, et ceux que ça intéresse
les écoutent. Par exemple, le boss ne sait pas qu'une barre de vie existe : il émet juste « ma vie a changé ».

| Événement | Émis par | Écouté par |
|---|---|---|
| `PLAYER_SPAWNED_EVENT` | EntityManager | MainUIScene (branche les barres) |
| `ENEMY_KILLED_EVENT` | BaseEnemy | PowerUpSpawner (fait peut-être tomber un bonus), Player (+0,25 PV par petit ennemi) |
| `BOSS_SPAWNED_EVENT` | BossDirector | MainUIScene (barre du boss) |
| `BOSS_FINISHER_READY_EVENT` | BossDirector | MainUIScene (message « HOLD F ») |
| `BOSS_KILLED_EVENT` | BossDirector | MainUIScene (cache la barre) |
| `Health.CHANGE_EVENT` | Health | Barres de vie, Boss |
| `Health.HIT_EVENT` | Health | Player (invulnérable un court instant) |
| `PowerUpSlot.START_EVENT` / `TICK_EVENT` / `END_EVENT` | PowerUpSlot | Player (applique l'effet), PowerUpDisplay (nom + timer) |
| `Boss.SUMMON_EVENT` | Boss | EntityManager (crée les renforts) |

## Les fichiers JSON (`public/assets/Data/`)

| Fichier | Ce qu'on y règle |
|---|---|
| `player.json` | Plafond de PV max, dégâts au contact, PV rendus par petit ennemi éliminé (`killHeal`), bonus de PV max après un boss ou un boss ultra |
| `playerShips.json` | Les 3 vaisseaux : nom, vitesse, dégâts, PV, sprite, parties secondaires à colorer, hitbox |
| `shipColors.json` | Les couleurs proposées dans le menu (elles ne colorent que les parties secondaires) |
| `enemies.json` | Les balles de l'UFO rouge, et l'ennemi sinusoïdal (spawn, zigzag, éventail) |
| `powerups.json` | Chance de drop (entre un min et un max), vitesse de chute, et les bonus : nom, durée (entre un min et un max), effets (dégâts, tir, bouclier, vitesse) |
| `bosses.json` | Tous les boss : quand ils arrivent, leur vie, leur mouvement, leurs attaques, les invocations |

## Recettes

**Ajouter un boss** : ajouter une entrée dans `bosses` (ou `ultraBosses`) de `bosses.json`.
Aucune ligne de code à écrire, sauf pour un tout nouveau type de mouvement.

**Ajouter un type de mouvement** :
1. créer le composant dans `components/` (implémenter `IPatternMovement`) ;
2. ajouter son type de données dans `gameData/MovementData.ts` ;
3. ajouter un `case` dans `utils/PatternMovementFactory.ts`.

**Ajouter un bonus** : ajouter une entrée dans `powerUps` de `powerups.json`, en combinant les effets
existants (`damageMultiplier`, `weapon`, `fireRateMultiplier`, `spread`, `piercing`, `shield`, `ram`, `speedMultiplier`, `shockwave`).

**Les niveaux de bonus** : ramasser le même bonus pendant qu'il est encore actif le fait monter d'un niveau
(jusqu'à 3). Dans `powerups.json`, `levels[0]` décrit le niveau 2 et `levels[1]` le niveau 3 : chaque niveau garde
les effets d'avant et ajoute ou remplace les siens. Si le bonus s'arrête avant, le suivant repart au niveau 1.

**Les combos** : attraper un bonus *différent* pendant qu'un bonus est actif fusionne les deux en un combo
(`combos` dans `powerups.json` : `parts` donne les `id` des deux bonus). C'est le `PowerUpSpawner` qui choisit
quoi activer (`resolvePickedPowerUp`). Pendant un combo, attraper un de ses deux bonus lui ajoute 25 % de sa durée
(`comboPartBonus`) ; un autre bonus disparaît sans effet.

**Changer l'équilibrage** : tout est dans les JSON, il suffit de recharger la page.

## Une notion piège : le pooling

Les balles et les ennemis normaux ne sont **jamais détruits** : quand ils meurent, ils sont désactivés
(`disable()`), puis réutilisés plus tard (`enable()`). Ça évite les ralentissements.
Conséquence : à chaque `enable()`, il faut **remettre l'objet à zéro** (vie, position, timer...).
Les boss, eux, sont créés puis détruits, car ils sont rares.
