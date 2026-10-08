# Radar

Tracker de tâches minimaliste : un backend Node (stdlib + [`pg`](https://www.npmjs.com/package/pg), zéro autre dépendance) qui sert une API façon PostgREST sur une base Postgres, un mur d'authentification par email + mot de passe partagé, et des flux d'activité (RSS / JSON Feed) alimentés automatiquement par un journal d'événements.

Pensé pour être déployé **standalone** (une instance = une équipe = une base Postgres) et, en option, agrégé par une plateforme externe (voir [Intégration Galahad](#intégration-galahad)).

## Fonctionnalités

- API type PostgREST (`/rest/v1/<table>`) : select/order/limit, filtres `eq/neq/gte/lte/is/in/cs`, INSERT/PATCH/DELETE — traduits en SQL paramétré, tables et colonnes en liste blanche.
- Journal d'activité automatique (`task_events`) → flux `/feed.xml` (RSS 2.0) et `/activity.json` (JSON Feed 1.1).
- Visuels de livrables (`POST /visuels`, service `GET /visuels/<f>`) : images compressées côté client (WebP ≤ 1200 px), revalidées serveur (MIME + magic bytes, ≤ 2 Mo), métadonnées en base (`brief_assets`), binaires sur le volume `/data/visuels`.
- Ingest des retours clients (`POST /ingest`) : texte libre → LLM local (Ollama) → tâches structurées (révision rattachée à un projet existant ou nouveau projet), insérées en statut « Reçu » et revues via la page « À valider ». Repli sans perte si Ollama est injoignable.
- Écran « Direction » (`/direction.html`) : synthèse pour non-opérateurs — à arbitrer, livraisons de la semaine, mur des travaux récents, transmission des retours clients.
- Authentification HTTP Basic + session cookie signée (HMAC-SHA256), avec self-service de mot de passe par utilisateur (`/profil`, stocké en SQLite locale).
- Trois niveaux d'autorité configurables (`owner` / `supervisor` / `member`) — voir [Configurer les accès](#configurer-les-accès).
- Périmètre de rôle et isolation `private_to` appliqués côté serveur aux tâches, commentaires, journal, CSV et médias.

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

Le schéma Postgres (`migrations/`) est appliqué automatiquement et de façon idempotente au démarrage (`server/pgrest.js`). Le volume `/data` conserve les mots de passe personnels (SQLite) **et les visuels de livrables** (`/data/visuels`) entre redéploiements — à inclure dans les sauvegardes côté hébergeur (Coolify : backup du volume `radar_data` ; la base Postgres se sauvegarde séparément, les binaires des visuels ne vivent que sur ce volume).

## Configuration

Voir [`.env.example`](.env.example) pour la liste complète des variables. Les essentielles :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Postgres. Sans elle, pas de backend actif. |
| `RADAR_NAME` | Nom affiché (titres, feeds, realm HTTP, logs). Défaut `Radar`. |
| `RADAR_ADMIN_EMAIL` | Un seul admin (`owner`), sans roster externe. |
| `RADAR_AUTHZ_JSON` | Chemin d'un JSON `{email: {person, role}}` pour un roster complet — prioritaire sur `RADAR_ADMIN_EMAIL`. |
| `DASH_PASSWORD` | Active le mur d'authentification (mot de passe partagé). |
| `RADAR_SEED_CSV` | CSV optionnel pour peupler une base vide au premier boot. |
| `VISUELS_DIR` | Répertoire des visuels de livrables. Défaut `/data/visuels` (repli `./data/visuels`). |
| `OLLAMA_URL` / `OLLAMA_MODEL` | LLM local pour l'ingest des retours clients (`/ingest`). Défauts `http://127.0.0.1:11434` / `llama3.2`. |

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

Le journal conserve la qualification de rôle des nouveaux événements, y compris après suppression. Les événements anciens sans cette qualification ne sont pas reconstruits à partir de l'état actuel : ils restent conservés mais ne sont pas affichés aux membres, et l'interface signale cet historique incomplet. Owners et superviseurs conservent la lecture selon la confidentialité historique. `INDEX.csv` est produit depuis la même base filtrée ; les fichiers métier CSV/JSON/Markdown/SQL déposés dans `briefs/` ne sont pas servis comme ressources statiques.

Les nouveaux commentaires et visuels portent un `brief_id` attribué exclusivement par le serveur. Une suppression suivie d'une réutilisation du code ne les transfère pas au nouveau dossier. Un changement de code du dossier conserve leurs liens dans la même transaction. Les anciens rattachements sans identifiant restent conservés et accessibles aux responsables selon la règle historique du code ; ils ne sont pas exposés aux membres et doivent encore être qualifiés. Cette compatibilité historique ne prouve pas leur provenance d'origine.

Ces règles concernent les routes protégées. `/jour.json`, `/jour.html` et les flux d'activité conservent leur contrat public explicite : données limitées et non privées ; `FEED_TOKEN` peut protéger les flux. Ils ne constituent pas des vues personnelles. La clé machine `RADAR_API_KEY` conserve son accès complet explicite. Les règles d'édition du wiki et de la configuration sont distinctes de ce périmètre de tâches.

## Intégration Galahad

Une instance Radar n'a rien de spécial à faire pour être agrégée : elle expose son API (`/rest/v1/*`) et ses flux (`/feed.xml`, `/activity.json`), protégés par `RADAR_API_KEY` pour un accès machine full-scope (voir `.env.example`).

Côté Galahad, une variable `RADAR_INSTANCES` (liste d'entrées `{name, baseUrl, apiKey}`, une par équipe/instance déployée) permet d'agréger plusieurs Radars indépendants sans qu'aucun ne connaisse l'existence des autres — chaque instance reste standalone et n'expose que ses propres données.

## Architecture

```
functions/_authz.js       source unique d'autorité (roster + rôles), config-driven
functions/_middleware.js  mur d'authentification (Basic Auth + cookie de session)
functions/_feed.js        flux RSS/JSON, lit task_events
functions/token.js        JWT par utilisateur (intégration RLS externe optionnelle)
functions/profil.js       self-service mot de passe
server/pgrest.js          mini-PostgREST maison + schéma + seed optionnel
server/visuels.js         visuels de livrables : upload / service / suppression (/visuels)
server/ingest.js          retours clients → tâches via Ollama (/ingest)
server/index.js           point d'entrée Node (remplace un runtime edge/Pages)
server/kv-sqlite.js       stockage des mots de passe perso (remplace un KV managé)
migrations/               schéma SQL, idempotent
```

## Développement

```bash
node --check <fichier>.js   # vérif syntaxe rapide
npm start                   # lance le serveur
# Recette HTTP sur une base locale jetable créée et supprimée par la suite :
RADAR_TEST_ADMIN_URL=postgresql://postgres:mot-de-passe@127.0.0.1:5432/postgres npm test
```

Aucun framework, aucun bundler : stdlib Node + `pg`.
