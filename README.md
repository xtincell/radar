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
- Isolation `private_to` appliquée côté serveur (pas seulement dans l'UI).

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
```

Backend : aucun framework, aucun bundler — stdlib Node + `pg`.

Front : SPA `briefs/index.html` construite sur le design system **Dashboard R26**
(React 18 + Babel standalone, sans étape de build — les `.jsx` sont compilés au
chargement). Runtimes auto-hébergés dans `briefs/vendor/`, polices dans
`briefs/fonts/` : aucun CDN. Routage par hash (`#/vue`), atterrissage par rôle
via `/profil`. La couche données (`briefs/supa.js` + `briefs/live-data.jsx`)
remplace les données de démonstration du kit par les lignes de la base quand
l'API répond ; sinon l'app affiche la démo avec une pastille explicite.
