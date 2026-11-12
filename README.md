# Radar

Tracker de tâches minimaliste : un backend Node (stdlib + [`pg`](https://www.npmjs.com/package/pg), zéro autre dépendance) qui sert une API façon PostgREST sur une base Postgres, un mur d'authentification par email + mot de passe partagé, et des flux d'activité (RSS / JSON Feed) alimentés automatiquement par un journal d'événements.

Pensé pour être déployé **standalone** (une instance = une équipe = une base Postgres) et, en option, agrégé par une plateforme externe (voir [Intégration Galahad](#intégration-galahad)).

## Fonctionnalités

- API type PostgREST (`/rest/v1/<table>`) : select/order/limit, filtres `eq/neq/gte/lte/is/in/cs`, INSERT/PATCH/DELETE — traduits en SQL paramétré, tables et colonnes en liste blanche.
- Code de dossier `ndeg` unique par instance : un POST qui reprend un code existant reçoit `409`, un filtre `ndeg=eq.` vise un seul dossier — voir [Codes de dossier uniques](#codes-de-dossier-uniques).
- Journal d'activité automatique (`task_events`) → flux `/feed.xml` (RSS 2.0) et `/activity.json` (JSON Feed 1.1), **non publiés par défaut** — voir [Ce qui est public](#ce-qui-est-public).
- Visuels de livrables (`POST /visuels`, service `GET /visuels/<f>`) : images compressées côté client (WebP ≤ 1200 px), revalidées serveur (MIME + magic bytes, ≤ 2 Mo), métadonnées en base (`brief_assets`), binaires sur le volume `/data/visuels`.
- Ingest des retours clients (`POST /ingest`) : texte libre → LLM local (Ollama) → tâches structurées (révision rattachée à un projet existant ou nouveau projet), insérées en statut « Reçu » et revues via la page « À valider ». Repli sans perte si Ollama est injoignable.
- Écran « Direction » (`/direction.html`) : synthèse pour non-opérateurs — à arbitrer, livraisons de la semaine, mur des travaux récents, transmission des retours clients.
- Authentification HTTP Basic + session cookie signée (HMAC-SHA256), avec self-service de mot de passe par utilisateur (`/profil`, stocké sous empreinte PBKDF2-SHA256 salée en SQLite locale — voir [Mots de passe personnels](#mots-de-passe-personnels)).
- Trois niveaux d'autorité configurables (`owner` / `supervisor` / `member`) — voir [Configurer les accès](#configurer-les-accès).
- Périmètre de rôle et isolation `private_to` appliqués côté serveur aux tâches, commentaires, journal, CSV et médias.
- Lecture des décisions La Barre (`server/barre.js`) : à intervalle, par jeton machine, reçues sans doublon et versionnées, privées par défaut — voir [Décisions La Barre](#décisions-la-barre).
- Relevé avant/après la bascule La Barre (`GET /mesure/avant-apres`, page `/mesure.html`) : durée et ponctualité des dossiers, décisions reçues, réouvertures, réattributions, échéances, révisions — en lecture seule, chaque chiffre avec son assise — voir [Indicateurs avant/après](#indicateurs-avantaprès).

## Démarrage rapide

```bash
cp .env.example .env
# éditer .env : au minimum DATABASE_URL

npm install
npm start
```

Le serveur écoute sur `PORT` (défaut `3000`). Sans `DATABASE_URL`, il démarre quand même mais ne sert que les assets statiques (aucune API/aucune donnée).

## Déploiement standalone (Docker)

```bash
docker build -t radar .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:password@host:5432/radar \
  -e RADAR_ADMIN_EMAIL=admin@example.com \
  -e DASH_PASSWORD=change-me \
  -v radar_data:/data \
  radar
```

Le serveur applique lui-même son schéma Postgres au démarrage, de façon idempotente et dans une seule transaction : celui qu'embarque `server/pgrest.js`, puis le journal `server/journal.sql`, puis les tables des décisions La Barre `server/barre.sql`, puis, après le semis éventuel, l'unicité des codes `server/ndeg.sql` (voir [Codes de dossier uniques](#codes-de-dossier-uniques)). Le dossier `migrations/` n'est **pas** appliqué : il porte des miroirs documentaires pour les bases gérées à la main. Une différence existe : `migrations/20260701_add_suivi.sql` rend `suivi` obligatoire (valeur par défaut `{}`), alors que le schéma embarqué le laisse facultatif. Le volume `/data` conserve les empreintes des mots de passe personnels (SQLite) **et les visuels de livrables** (`/data/visuels`) entre redéploiements — à inclure dans les sauvegardes côté hébergeur (Coolify : backup du volume `radar_data` ; la base Postgres se sauvegarde séparément, les binaires des visuels ne vivent que sur ce volume).

## Configuration

Voir [`.env.example`](.env.example) pour la liste complète des variables. Les essentielles :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Postgres. Sans elle, pas de backend actif. |
| `RADAR_NAME` | Nom affiché (titres, feeds, realm HTTP, logs). Défaut `Radar`. |
| `RADAR_ADMIN_EMAIL` | Un seul admin (`owner`), sans roster externe. |
| `RADAR_AUTHZ_JSON` | Chemin d'un JSON `{email: {person, role}}` pour un roster complet — prioritaire sur `RADAR_ADMIN_EMAIL`. |
| `DASH_PASSWORD` | Active le mur d'authentification (mot de passe partagé). |
| `RADAR_SEED_CSV` | CSV optionnel pour peupler une base vide au premier boot. Au tout premier démarrage, des codes en double y sont dédoublonnés comme les homonymes existants ; une fois la contrainte posée, un CSV qui répète un code fait échouer le semis. |
| `FEED_PUBLIC` | `1` publie `/feed.xml` et `/activity.json` sans connexion. Défaut : non publié. |
| `FEED_TOKEN` | Publie ces flux aux seuls détenteurs du jeton (`?token=…`). Prime sur `FEED_PUBLIC`. |
| `JOUR_PUBLIC` | `1` publie `/jour.html` et `/jour.json` sans connexion. Défaut : derrière le mur. |
| `VISUELS_DIR` | Répertoire des visuels de livrables. Défaut `/data/visuels` (repli `./data/visuels`). |
| `OLLAMA_URL` / `OLLAMA_MODEL` | LLM local pour l'ingest des retours clients (`/ingest`). Défauts `http://127.0.0.1:11434` / `llama3.2`. |
| `BARRE_URL` / `BARRE_RADAR_TOKEN` | Adresse de La Barre et jeton machine de sa route `/radar/decisions`. Les deux requis, jeton d'au moins 32 caractères ; sinon le lecteur reste désactivé. |
| `BARRE_INSTANCE` | Nom stable de l'installation La Barre dans les reçus. Défaut : l'hôte de `BARRE_URL` — à fixer, sans quoi un changement d'adresse ouvre une nouvelle série de reçus. |
| `BARRE_INTERVAL_MIN` | Minutes entre deux lectures. Défaut `15`, plancher 1 s ; `0` désactive. |
| `RADAR_INSTANCE` | Nom de cette instance inscrit dans chaque correspondance projet ↔ dossier. Défaut : `RADAR_NAME`, sinon `Radar`. |
| `MESURE_BASCULE` | Jour de bascule du relevé avant/après (date ISO ; une date seule vaut minuit UTC). Défaut : la première lecture réussie de La Barre (voir [Indicateurs avant/après](#indicateurs-avantaprès)). |

### Configurer les accès

L'autorité (qui se connecte, avec quel niveau) est **entièrement pilotée par la config**, jamais par du code en dur (`functions/_authz.js`) :

1. `RADAR_AUTHZ_JSON=/chemin/vers/authz.json` — roster complet :
   ```json
   {
     "alice@example.com": { "person": "Alice", "role": "owner" },
     "bob@example.com":   { "person": "Bob",   "role": "member" }
   }
   ```
2. À défaut, `RADAR_ADMIN_EMAIL=admin@example.com` — un seul compte `owner`.
3. Sans aucune des deux — roster vide, personne n'a accès (posture restrictive par défaut, zéro PII embarquée dans le repo).

Rôles : `owner` (tout + `/rh`), `supervisor` (toutes les tâches, toutes périodes), `member` (ses tâches du mois en cours).

Le périmètre membre inclut les co-responsabilités exactes (`/`, `&`, `;`, `et`) et le travail sans échéance calendaire encore ouvert. Un travail sans date clos, livré ou gelé est exclu. Le mois de l'instance suit `TZ` ; `/profil` le transmet à l'interface pour éviter une deuxième décision selon le fuseau du navigateur. `private_to` s'applique aussi aux owners et superviseurs. Un membre sans personne configurée ne reçoit aucune tâche. Une identité indisponible dans l'interface n'accorde aucun accès administrateur.

Les écritures vérifient les dossiers sous verrou. Un lot contenant une ligne hors périmètre est refusé entièrement (403), sans écriture ni événement partiels. Transmettre sa propre tâche reste possible : l'ancien responsable perd ensuite son accès, y compris aux commentaires et aux binaires. Les commentaires et visuels exigent un code de dossier unique et autorisé. L'import transmet uniquement les projets accessibles au modèle, rattache les nouvelles tâches du membre à son nom et recontrôle les parents avant insertion. Les codes sont alloués sous un verrou de table bref.

Le journal conserve la qualification de rôle des nouveaux événements, y compris après suppression. Les événements anciens sans cette qualification ne sont pas reconstruits à partir de l'état actuel : ils restent conservés mais ne sont pas affichés aux membres, et l'interface signale cet historique incomplet. Owners et superviseurs conservent la lecture selon la confidentialité historique ; un événement dont la confidentialité est inconnue leur reste lisible jusqu'à sa relecture (voir [Événements anciens à relire](#événements-anciens-à-relire)). `INDEX.csv` est produit depuis la même base filtrée ; les fichiers métier CSV/JSON/Markdown/SQL déposés dans `briefs/` ne sont pas servis comme ressources statiques.

Les nouveaux commentaires et visuels portent un `brief_id` attribué exclusivement par le serveur. Une suppression suivie d'une réutilisation du code ne les transfère pas au nouveau dossier. Un changement de code du dossier conserve leurs liens dans la même transaction. Les anciens rattachements sans identifiant restent conservés et accessibles aux responsables selon la règle historique du code ; ils ne sont pas exposés aux membres et doivent encore être qualifiés. Cette compatibilité historique ne prouve pas leur provenance d'origine.

Ces règles concernent les routes protégées. `/jour.json`, `/jour.html` et les flux d'activité ne sont publiés sans connexion que si l'installation le choisit ; sinon ils sont derrière le mur comme le reste (voir [Ce qui est public](#ce-qui-est-public)). La clé machine `RADAR_API_KEY` conserve son accès complet explicite, flux compris. Les règles d'édition du wiki et de la configuration sont distinctes de ce périmètre de tâches.

### Mots de passe personnels

`/profil` permet à chaque utilisateur de remplacer, pour son compte, le mot de passe partagé `DASH_PASSWORD` (4 caractères minimum). `GET /profil` indique seulement si un mot de passe personnel existe (`perso`), jamais sa valeur ni son format.

Seule une empreinte est stockée, dans la table `dash_users` du fichier `SQLITE_PATH` :

```
pbkdf2-sha256$600000$<sel base64>$<empreinte base64>
```

PBKDF2-HMAC-SHA256 par WebCrypto (`functions/_password.js`), 600 000 itérations (recommandation OWASP), sel aléatoire de 16 octets, empreinte de 32 octets, comparaison en temps constant. Le format porte ses paramètres : une empreinte plus faible que les paramètres courants est renforcée à la connexion suivante. Le stockage refuse toute autre valeur et efface l'ancienne cellule (`secure_delete`). Le mot de passe partagé reste une variable d'environnement, comparé lui aussi en temps constant ; les sessions déjà ouvertes ne changent pas. Limite : Cloudflare Workers plafonne PBKDF2 à 100 000 itérations, ces empreintes ne s'y vérifieraient pas ; le runtime déployé est Node 22.

Une valeur sans préfixe `pbkdf2-sha256$` est un ancien mot de passe en clair : elle reste acceptée à la prochaine connexion réussie, puis elle est remplacée par son empreinte. Une valeur qui porte le préfixe sans être lisible est refusée, jamais relue comme du clair. Pour convertir aussi les comptes qui ne se reconnectent pas (une session dure 30 jours), après le déploiement de cette version :

```bash
node server/hash-passwords.js           # convertit chaque valeur en clair, idempotent, puis VACUUM
node server/hash-passwords.js --check   # n'écrit rien ; code de sortie 1 s'il reste du clair
```

Dans l'image Docker, `SQLITE_PATH` vaut déjà `/data/dash-users.sqlite3` : `docker exec <conteneur> node server/hash-passwords.js` (ou le terminal de la ressource dans Coolify). Le serveur peut rester en marche : chaque ligne est remplacée seulement si elle n'a pas changé entre-temps. Les sauvegardes du volume faites avant la conversion contiennent toujours les mots de passe en clair.

## Codes de dossier uniques

Arbitrage 5.7 du 12 novembre 2026. Le code `ndeg` d'un dossier est unique par instance, au niveau de la base (contrainte `briefs_ndeg_unique`). Un dossier reste identifié par `briefs.id` ; `ndeg` est son code lisible, désormais sans homonyme. Les dossiers sans code (`ndeg` NULL) restent possibles et ne se visent pas par code.

**API.** Il n'y a pas d'upsert : un POST qui reprend un code existant est refusé, sans dossier ni événement, avec `409` et `{"message": "le code « X » est déjà porté par un autre dossier (ndeg unique) : …", "ndeg": "X"}`. Le message ne révèle pas le dossier qui porte le code. Un lot qui répète un code est refusé entier. Des POST simultanés du même code donnent un seul dossier. Un PATCH qui donne à un dossier le code d'un autre reçoit le même `409`. `PATCH` et `DELETE` sur `?ndeg=eq.X` touchent un seul dossier. Un client qui rejoue un POST après une réponse perdue lit `?ndeg=eq.X` pour retrouver son dossier, puis le modifie par PATCH. Changer le code d'un dossier produit un événement `renamed` (« Code X → Y ») au journal.

**Migration au déploiement.** Au premier démarrage de cette version, `server/ndeg.sql` dédoublonne les homonymes existants puis pose la contrainte, dans la transaction de démarrage (tout ou rien ; en cas d'échec, rien n'est écrit et l'API répond `503`). Les démarrages suivants ne font rien. Aucun dossier ni événement n'est supprimé :

- par code, le dossier le plus ancien (`created_at`, puis `id` ; date inconnue en dernier) garde le code ; les suivants reçoivent `X-2`, `X-3`… dans l'ordre de création, en sautant tout code déjà employé par un dossier, un commentaire, un visuel ou un événement — un code attribué ne désigne jamais une ancienne trace ;
- un code vide (`''`) en double n'est pas un code : les suivants deviennent NULL ;
- chaque renommage est inscrit dans `briefs_ndeg_renommes` (`brief_id`, `ndeg_origine`, `ndeg_attribue`, `rang`, `garde_id`, `at`) et produit un événement `renamed` au journal, avec la confidentialité du dossier ;
- commentaires et visuels rattachés par `brief_id` suivent le nouveau code ; un ancien rattachement par code seul (sans `brief_id`) vers un code qui était en double n'est attribué à aucun dossier : il est conservé, marqué `ndeg_ambigu`, invisible par REST et refusé en écriture (`409`), comme avant la migration.

Le journal du serveur donne les comptes : `[pgrest] unicité ndeg posée · N code(s) en double, M dossier(s) renommé(s), K ancien(s) rattachement(s) ambigu(s) …`. Pour relire les renommages : `select * from briefs_ndeg_renommes order by garde_id, rang;`. Une base gérée à la main applique `psql -f server/ndeg.sql` après `server/journal.sql` ; la dernière ligne affiche les mêmes comptes.

## Ce qui est public

Arbitrage 5.7 : rien n'est publié sans connexion par défaut. Chaque sortie anonyme est un choix de l'installation (`functions/_publication.js`) :

| Sortie | Par défaut | Pour la publier |
|---|---|---|
| `/feed.xml`, `/activity.json` | Non publiés. Derrière le mur : aperçu pour `owner`, `supervisor` et la clé machine ; `403` pour un membre. | `FEED_PUBLIC=1` (sans jeton), ou `FEED_TOKEN=<secret>` (aux détenteurs de `?token=<secret>`, comparé en temps constant). `FEED_TOKEN` prime. |
| `/jour.html`, `/jour.json` | Derrière le mur ; `/jour.json` suit le périmètre de rôle de la personne connectée. | `JOUR_PUBLIC=1`. |

Valeurs reconnues pour `FEED_PUBLIC` et `JOUR_PUBLIC` : `1`, `true`, `oui`, `yes`, `on` ; toute autre valeur laisse fermé. Une sortie publiée envoie `Access-Control-Allow-Origin: *` ; l'aperçu privé non. La clé `RADAR_API_KEY` lit les flux dans tous les cas.

Publier ne change pas le contenu : le flux ne contient que les mouvements publics qualifiés (dossier et événement sans `private_to`), jamais un dossier privé, jamais un événement ancien à confidentialité inconnue ; la vue du jour, que des dossiers non privés.

Exemple, instance qui garde son flux pour un lecteur RSS et un écran de bureau :

```bash
FEED_TOKEN=un-secret-long          # https://radar.example.com/feed.xml?token=un-secret-long
JOUR_PUBLIC=1                      # https://radar.example.com/jour.html sans connexion
```

## Événements anciens à relire

Un événement écrit avant que le journal n'enregistre la confidentialité porte `private_to` NULL (125 sur l'instance personnelle). Il est traité comme privé jusqu'à relecture : absent de tout flux, même publié ; invisible d'un membre ; lisible par `owner` et `supervisor` (`GET /rest/v1/task_events?private_to=is.null`). Les flux et l'en-tête `X-Radar-Unqualified-Events` donnent leur nombre.

Un responsable le qualifie explicitement :

```bash
curl -X POST https://radar.example.com/journal/revue -u sue@example.com \
  -H 'Content-Type: application/json' -d '{"ids": [12, 13], "decision": "public"}'
curl -X POST https://radar.example.com/journal/revue -u sue@example.com \
  -H 'Content-Type: application/json' -d '{"ids": [14], "decision": "prive", "private_to": "Alice"}'
```

Réservé à `owner`, `supervisor` et à la clé machine ; corps `application/json` (sinon `415`) ; tout ou rien. Qui et quand sont inscrits (`revue_par`, `revue_le`) ; le contenu de l'événement ne change pas. Refus : un événement qualifié à sa création (`409`) ; un événement déjà relu et privé à une autre personne (`403`) ; « public » quand le dossier qui porte aujourd'hui ce code est privé (`409`). Une décision se corrige par la même route, par exemple « public » → « prive ». Même relu « public », un événement n'est publié que si un flux l'est.

## Intégration Galahad

Une instance Radar n'a rien de spécial à faire pour être agrégée : elle expose son API (`/rest/v1/*`) et ses flux (`/feed.xml`, `/activity.json`), protégés par `RADAR_API_KEY` pour un accès machine full-scope (voir `.env.example`). Les outils `radar_get`, `radar_update` et `radar_delete` visent un dossier par `ndeg=eq.X` : un seul dossier depuis l'unicité ; `radar_create` reçoit `409` sur un code déjà pris.

Côté Galahad, `RADAR_INSTANCES` liste les noms des instances, séparés par des virgules. Chaque nom porte ensuite son adresse et sa clé dans deux variables, le nom passant en majuscules :

```bash
RADAR_INSTANCES=perso,equipe
RADAR_PERSO_URL=https://radar.example.com
RADAR_PERSO_KEY=…            # la RADAR_API_KEY de cette instance
RADAR_EQUIPE_URL=…
RADAR_EQUIPE_KEY=…
```

Galahad agrège ainsi plusieurs Radars indépendants sans qu'aucun ne connaisse l'existence des autres : chaque instance reste autonome et n'expose que ses propres données.

## Décisions La Barre

SHK-0005, sens 1, arbitrage 5.5 du 11 novembre 2026 : Radar va chercher les décisions de La Barre ; La Barre n'écrit rien dans Radar. Le lecteur `server/barre.js` est la seule tâche périodique du serveur. Il démarre après la préparation de la base et reste désactivé sans `BARRE_URL` et `BARRE_RADAR_TOKEN` (voir [Configuration](#configuration)).

**Ce qu'il lit.** `GET <BARRE_URL>/radar/decisions`, avec `Authorization: Bearer <BARRE_RADAR_TOKEN>` et l'`ETag` de la lecture précédente, gardé en base : une base inchangée répond `304`, y compris après un redémarrage. La route La Barre ne sert que les décisions — ni personnes, ni facturation, ni le reste du dépôt —, chacune avec son identifiant stable, son projet La Barre, sa date `quand`, son auteur déclaré (`qui`, `acteur`) et une `empreinte_contenu` (SHA-256 du JSON canonique : clés triées à toutes les profondeurs, sans espace). Radar recalcule cette empreinte et refuse une décision qui ne la porte pas. Une redirection est refusée (le jeton ne part pas ailleurs) ; une réponse au-delà de 32 Mo ou de 30 s échoue.

**Ce qu'il écrit**, dans une seule transaction par lecture, verrouillée par instance (deux lectures simultanées se suivent) :

- `barre_recus` — un reçu par (instance La Barre, `decision.id`, version). La même empreinte ne produit rien ; une empreinte changée produit la version suivante et l'ancienne reste ; une décision absente d'une nouvelle lecture de la **même** base de référence produit une version `retiree`, qui garde ses champs descriptifs. Rien n'est effacé ni réécrit. Une décision refusée, ou nommée dans `ecartees` par La Barre (identifiant manquant ou pris deux fois), n'est pas retirée. Une autre base de référence ne retire rien : le compte rendu le signale.
- `barre_lectures` — par instance : l'`ETag`, la base de référence, l'heure et le statut de la dernière lecture (`recu`, `inchange`, `echec`), son message et ses comptes. Une lecture en échec n'écrit aucun reçu.

`quand` est la date de la décision, telle que La Barre la déclare (colonne `quand`, et `quand_declare` intacte si ce n'est pas une date ISO 8601). `at` est l'heure d'écriture dans Radar : un retard de lecture ne la confond pas avec `quand`.

**Rattachement.** Radar identifie un dossier par `briefs.id` ; une décision nomme un projet La Barre. La correspondance vit dans `barre_projets` : (instance La Barre, projet) → (instance Radar, `briefs.id`), une par projet. Elle se tient par REST, réservée aux rôles `owner` et `supervisor` (et à la clé machine) : `POST /rest/v1/barre_projets` avec `barre_instance`, `projet` et `brief_id` d'un dossier existant et visible ; le serveur pose `radar_instance` et `created_by` et refuse qu'on les fournisse. Une correspondance ne se modifie pas : elle se supprime (`DELETE …?id=eq.<id>`) puis se recrée. Aucune correspondance n'est déduite d'un code `ndeg`.

**Lecture.** La vue `barre_decisions` (REST, lecture seule) donne toutes les versions, la courante marquée (`courante`), la décision qui en remplace une autre (`remplace`, `remplacee_par`) et le rattachement calculé à la lecture : `rattachee`, `non_rattachee` (aucune correspondance), `sans_projet` (décision de campagne ou de marque), `dossier_introuvable`. Une correspondance ajoutée plus tard rattache aussi les décisions déjà reçues.

**Confidentialité.** Les décisions sont privées par défaut. Elles ne sont écrites ni dans `briefs` ni dans `task_events` : elles n'apparaissent pas dans `/activity.json`, `/feed.xml`, `/jour.json` ni `/INDEX.csv`. `barre_decisions`, `barre_projets` et `barre_lectures` sont réservées à `owner` et `supervisor` ; un membre reçoit `403`. Une décision rattachée suit la confidentialité de son dossier (`private_to`) ; une décision non rattachée est visible des superviseurs. L'arbitrage 5.7 du 12 novembre 2026 garde les flux privés par défaut ; publiés ou non, les décisions n'y entrent pas.

**Ce que cette lecture ne reçoit pas.** La mesure avant/après est calculée à part, en lecture seule (voir [Indicateurs avant/après](#indicateurs-avantaprès)). L'attestation de La Fusée et le contenu créatif d'une piste ne sont pas transmis. Les changements de correspondance ne sont pas journalisés. Le chemin réseau entre Radar et La Barre en production (La Fusée devant La Barre, ou réseau privé) reste à décrire et à recevoir. Recette et limites : [docs/RECEPTION-BARRE.md](docs/RECEPTION-BARRE.md).

## Indicateurs avant/après

Arbitrage 5.6 du 12 novembre 2026. `GET /mesure/avant-apres` (JSON) et la page `/mesure.html` comparent deux fenêtres de même longueur autour de la **bascule**, le jour où Radar a commencé à lire La Barre. Réservé à `owner`, `supervisor` et à la clé machine (`403` pour un membre), calculé sur le périmètre de l'appelant avec les mêmes prédicats que REST ; rien n'est écrit, aucune tâche périodique n'est ajoutée.

- **Bascule** : `MESURE_BASCULE` si fournie ; sinon le premier reçu écrit dans `barre_recus` (jamais réécrit) ; sinon `barre_lectures.derniere_reussite`, signalée provisoire car elle avance à chaque lecture reçue. Sans aucune des trois, le relevé le dit et ne calcule aucune fenêtre.
- **Fenêtres** : `?jours=N` (1 à 3650, défaut 90) de part et d'autre ; réduites au temps écoulé depuis la bascule s'il est plus court, pour rester égales. Une fenêtre « avant » sans aucun événement du journal est signalée (l'équipe n'utilisait peut-être pas Radar).
- **Dossiers** : un dossier compte dans une fenêtre s'il y est ouvert (`created`) et clos ; ouvert avant la bascule et clos après, il est **à cheval**, compté à part avec les mêmes indicateurs, jamais dans l'une ou l'autre fenêtre.
- **Indicateurs** : durée (moyenne, médiane), ponctualité (comme `sla.html`, échéances au format jour seulement), réouvertures, réattributions, changements et reports d'échéance, révisions (`PARENT.RN`) ; décisions La Barre par verdict et retours par dossier rattaché, datées par `quand`, non rattachées comptées comme telles. Chaque bloc porte `n` ; sans fait, `null` et un `motif`. Le taux de reprise sur versions et les tours au-delà du vendu sont rendus `null` : non calculables depuis Radar.

La clôture se lit dans la transition de statut de chaque événement : le genre `closed` du journal ne couvre pas Bouclé, Validé ni Envoyé dans Slack. Définitions complètes, choix et limites : [docs/RECEPTION-MESURE.md](docs/RECEPTION-MESURE.md).

## Architecture

```
functions/_authz.js       source unique d'autorité (roster + rôles), config-driven
functions/_middleware.js  mur d'authentification (Basic Auth + cookie de session)
functions/_feed.js        flux RSS/JSON, lit task_events
functions/_publication.js ce que l'installation publie sans connexion (FEED_PUBLIC, FEED_TOKEN, JOUR_PUBLIC)
functions/token.js        JWT par utilisateur (intégration RLS externe optionnelle)
functions/profil.js       self-service mot de passe
functions/_password.js    empreintes des mots de passe personnels (PBKDF2-SHA256)
server/pgrest.js          mini-PostgREST maison + schéma + seed optionnel
server/visuels.js         visuels de livrables : upload / service / suppression (/visuels)
server/ingest.js          retours clients → tâches via Ollama (/ingest)
server/barre.js           lecteur périodique des décisions La Barre (reçus, versions, retraits)
server/barre.sql          tables barre_recus, barre_projets, barre_lectures et vue barre_decisions
server/ndeg.sql           unicité de ndeg : dédoublonnage tracé des homonymes, puis contrainte
server/revue.js           relecture des événements anciens à confidentialité inconnue (/journal/revue)
server/mesure.js          relevé avant/après la bascule La Barre (/mesure/avant-apres), lecture seule
server/index.js           point d'entrée Node (remplace un runtime edge/Pages)
server/kv-sqlite.js       stockage des empreintes de mots de passe perso (remplace un KV managé)
server/hash-passwords.js  conversion en masse des anciens mots de passe en clair
migrations/               miroirs SQL pour bases gérées à la main ; non appliqués par le serveur
```

## Développement

```bash
node --check <fichier>.js   # vérif syntaxe rapide
npm start                   # lance le serveur
# Recette HTTP sur une base locale jetable créée et supprimée par la suite :
RADAR_TEST_ADMIN_URL=postgresql://postgres:mot-de-passe@127.0.0.1:5432/postgres npm test
# Recette des mots de passe seule, sans Postgres :
node --test tests/mots-de-passe.test.mjs
```

Aucun framework, aucun bundler : stdlib Node + `pg`.
