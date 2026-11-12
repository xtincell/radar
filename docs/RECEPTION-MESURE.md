# Indicateurs avant/après

L'arbitrage 5.6 du 12 novembre 2026 décide de mesurer, de part et d'autre du
jour où Radar a commencé à lire La Barre, ce que Radar sait réellement. Le
câblage (radar#8, radar#9) rendait la mesure possible ; cette branche la
calcule. Ce document dit ce qui est mesuré, comment, et ce qui ne l'est pas.

## La route

`GET /mesure/avant-apres` (JSON), lue par la page `/mesure.html`. Lecture
seule : une transaction `REPEATABLE READ, READ ONLY`, aucune écriture, aucune
tâche périodique, aucune dépendance nouvelle. Réservée à `owner`, `supervisor`
et à la clé machine ; un membre reçoit `403`, un anonyme `401`.

`?jours=N` règle la longueur de chaque fenêtre (entier de 1 à 3650, défaut 90) ;
toute autre valeur reçoit `400`.

## Choix retenus

**Bascule.** `MESURE_BASCULE` si l'installation la fournit (date ISO ; une date
seule vaut minuit UTC ; illisible, le relevé le dit et ne calcule rien). Sinon,
la plus ancienne preuve de lecture réussie de La Barre :

- le premier reçu écrit dans `barre_recus` (`at`) : il n'est jamais réécrit,
  la bascule est stable ;
- à défaut, `barre_lectures.derniere_reussite`, rendue avec `provisoire: true`.

Le contrat demandait « la première `derniere_reussite` connue ». Or cette
colonne est réécrite à chaque lecture qui reçoit une réponse `200` : prise
seule, elle avancerait avec le temps et la fenêtre « après » se viderait. Le
premier reçu est la même preuve, figée. Une première lecture réussie qui n'a
reçu aucune décision ne laisse en revanche aucune trace durable : pour un
relevé stable en production, poser `MESURE_BASCULE`. Sans lecture réussie ni
date fournie, le relevé le dit (`bascule.date: null` et un motif) et ne calcule
aucune fenêtre, ni « avant » ni « après ». Une bascule future est traitée de même.

**Fenêtres.** `[bascule − L, bascule)` et `[bascule, bascule + L)`. `L` vaut la
longueur demandée, réduite au temps écoulé depuis la bascule quand il est plus
court, pour que les deux fenêtres restent égales (`tronquee: true` et un motif).
Une fenêtre « avant » sans aucun événement du journal visible est signalée
(`journal.avant_vide`) : l'équipe n'utilisait peut-être pas Radar.

**Dossiers.** Ouverture : l'événement `created` du dossier, par `brief_id`.
Clôture : la dernière transition vers un statut terminal, le dossier étant
encore terminal. Un dossier compte dans une fenêtre s'il y est **ouvert et
clos**. Chaque dossier va dans une seule case :

| Case | Règle |
|---|---|
| `avant` | ouvert et clos dans la fenêtre avant |
| `apres` | ouvert et clos dans la fenêtre après |
| `a_cheval` | ouvert avant la bascule, clos à partir d'elle (quelle que soit la date de clôture) |
| `hors_fenetre` | ouvert ou clos hors des deux fenêtres |
| `non_clos` | encore ouvert, ou clos sans transition visible au journal |
| `cree_clos` | créé directement dans un statut terminal (import, semis) |
| `sans_ouverture` | aucun `created` visible : dossier antérieur au rattachement du journal, ou création hors du périmètre de l'appelant |
| `exclus` | `Doublon`, code commençant par `≈`, ou `Archivé`, comme `briefs/sla.html` |
| `supprimes` | dossier supprimé dont la suppression est visible |

**Règle des dossiers à cheval.** Un dossier à cheval mesure en partie
l'ancienne façon de travailler et en partie la nouvelle ; le ranger d'un côté
fausserait les deux. Il est donc compté à part, avec les mêmes indicateurs
(colonne « à cheval »), jamais dans l'une ou l'autre fenêtre. Ses décisions La
Barre le suivent. Exiger l'ouverture et la clôture dans la même fenêtre rend
la règle symétrique : chaque fenêtre ne retient que des dossiers entièrement
contenus, de même durée maximale.

**Faits d'un dossier.** Réouvertures, réattributions, changements d'échéance
et révisions comptent entre l'ouverture du dossier et la fin de sa fenêtre (la
bascule pour « avant », la fin de « après », l'heure du calcul pour un dossier
à cheval) : aucun fait postérieur à la bascule n'entre dans « avant ».

**Assise.** Chaque bloc porte `n`, le nombre de faits sur lequel il repose.
Sans fait (`n: 0`), toutes ses valeurs sont `null` et il porte un `motif` :
jamais un zéro inventé, jamais une moyenne sur rien. Un zéro rendu est un zéro
mesuré (par exemple `dossiers_rouverts: 0` sur `n: 2`). Le retard moyen repose
sur `en_retard` ; il est `null` quand aucun dossier compté n'est en retard.

**Confidentialité.** Mêmes prédicats que REST, factorisés dans
`server/pgrest.js` (`taskEventScopeSql`, `decisionScopeSql`) : dossiers selon
`private_to`, journal selon la confidentialité de l'événement, du dossier et de
sa suppression, décisions selon leur dossier. Ce qui est hors du périmètre de
l'appelant n'est ni compté ni signalé. Un événement à confidentialité inconnue
(`private_to` NULL, radar#9) ne compte que pour qui le lit par REST : jamais
pour un membre (refusé), jamais pour un superviseur quand il est rattaché à un
dossier privé d'autrui. Le relevé ne contient aucun code, titre ni nom.

## Ce qui est mesuré

1. **Durée et ponctualité.** Durée ouverture → clôture en jours (moyenne,
   médiane, `n`). Ponctualité comme `briefs/sla.html` : à temps si la date UTC
   de `closed_at` est au plus tard l'échéance ; seules les échéances au format
   `AAAA-MM-JJ` comptent ; les dossiers sans échéance au jour ou sans
   `closed_at` sont comptés à côté (`non_comptes`). L'échéance est celle du
   dossier aujourd'hui, reports compris ; les reports se lisent dans la
   famille 3.
2. **La Barre, ce que Radar reçoit.** Décisions courantes reçues (une décision
   retirée par La Barre est exclue et comptée), rangées par leur date `quand`,
   jamais par `at`. Par verdict (`approuve`, `reserve`, `retour`, `hors`,
   `autre`) ; rattachées, non rattachées, sans projet, dossier introuvable.
   Retours par dossier rattaché, par la correspondance `barre_projets` ; aucun
   code `ndeg` n'est deviné. Plusieurs projets La Barre peuvent pointer vers un
   même dossier : ils se cumulent sur lui. Une décision supplantée (`remplace`)
   reste un fait à sa date.
3. **Réouvertures, réattributions, échéances, révisions.** Part des dossiers
   rouverts et nombre de réouvertures ; réattributions par dossier ;
   changements d'échéance et reports à une date plus tardive ; révisions
   (entrées de code `PARENT.RN`, `server/ingest.js`) par dossier d'origine, les
   entrées sans dossier d'origine visible étant comptées à part
   (`revisions_sans_origine`).

### Pourquoi la transition de statut, et pas seulement le genre

Le trigger du journal (`server/journal.sql`) écrit `closed` et `reopened` pour
Livré, Clôturé, Terminé… mais pas pour Bouclé, le statut de clôture de
l'interface (`briefs/ui.js`), ni pour Validé, Envoyé dans Slack ou Livré
(cycle) : ces passages sont journalisés `status`. Compter le seul genre
`closed` laisserait la plupart des clôtures réelles hors de la mesure. Le
relevé lit donc la transition `statut_old → statut_new` que porte chaque
événement ; `closed` et `reopened` en sont un sous-ensemble.

De même, le journal n'écrit qu'un événement par écriture, le premier de la
chaîne statut → responsable → échéance. Un responsable ou une échéance changé
dans la même écriture qu'un statut n'a pas son propre événement. Le relevé
lit donc `resp_old → resp_new` et l'échéance de l'instantané (`scope_snapshot`)
d'un événement à l'autre.

Pour garder la lecture stricte du contrat, chaque bloc dit la part qui vient du
genre nommé : `dont_genre_closed`, `dont_genre_reopened`,
`dont_genre_reassigned`, `dont_genre_deadline`.

## Ce qui ne l'est pas

- **Taux de reprise sur versions** et **tours au-delà du vendu** : rendus
  `valeur: null`, « non calculable depuis Radar ». Les versions et pistes d'un
  livrable restent dans La Barre, et le nombre de tours vendus n'est pas
  transmis : Radar ne reçoit que les décisions.
- **La cause.** Le relevé compare deux périodes ; il n'attribue pas une
  différence à La Barre. Aucun test de signification n'est fait ; l'assise `n`
  dit sur combien de dossiers chaque écart repose.
- **La livraison réelle.** Une clôture est un statut saisi ; elle ne prouve ni
  la remise d'un fichier ni l'accord d'un client (voir
  [RECEPTION-JOURNAL.md](RECEPTION-JOURNAL.md)).
- **Les dossiers antérieurs au journal rattaché.** Un dossier créé avant que le
  journal ne porte `brief_id` n'a pas d'ouverture lisible : il est compté
  `sans_ouverture`, sans durée. Les 125 événements anciens de l'instance
  personnelle n'ont pas de `brief_id` : ils comptent dans
  `journal.non_attribues` et dans l'activité des fenêtres, jamais dans un
  dossier. Aucune date n'est reconstruite depuis `created_at`, `date_reception`
  ou le code.
- **L'ouverture d'un dossier semé** depuis un CSV est l'heure du semis.

## Recette locale

PostgreSQL 16.15 jetable (cluster créé puis supprimé), Node 22 ; aucune
installation, aucun dossier réel, aucune base de production touchée. Les
dossiers sont écrits par SQL, le journal se remplit par le trigger, puis chaque
événement est daté autour d'une bascule fixée 60 jours plus tôt, avec des
fenêtres de 30 jours. Les décisions La Barre sont des reçus écrits directement.

`tests/mesure.test.mjs` reçoit 9 cas :

1. sans lecture réussie ni date fournie, aucune fenêtre, motif dit ; une
   lecture en échec n'est pas une bascule ;
2. bascule depuis `barre_lectures` (provisoire), puis depuis le premier reçu ;
   fenêtres réduites et égales ; `jours` paramétrable et refusé hors bornes ;
3. `MESURE_BASCULE` prime ; illisible ou à venir, aucune fenêtre ;
4. fenêtre « avant » vide dite ; absence (`null` + motif) distincte du zéro
   mesuré ; ponctualité sans échéance au jour rendue absente, pas 0 % ;
5. durée, ponctualité (échéances au mois et `S47` ignorées, le jour même à
   temps), dossier à cheval à part, hors fenêtre, non clos, créé clos, exclus ;
6. réouverture, réattribution et changement d'échéance masqués par un
   changement de statut dans la même écriture, comptés ; révision dans la
   fenêtre comptée, révision postérieure et révision sans origine non ;
7. décisions par verdict et par dossier, datées par `quand` (un `at` dans la
   fenêtre avant ne déplace rien), non rattachées, sans projet, sans date,
   retirées, hors fenêtre, décision d'un dossier à cheval à part ; deux
   indicateurs « non calculable depuis Radar » ;
8. périmètre : anonyme `401`, membre `403` sans contenu ; un superviseur ne
   voit ni le dossier privé d'autrui, ni sa suppression, ni l'événement à
   confidentialité inconnue qui lui est rattaché, ni sa décision ; la
   propriétaire et la clé machine les comptent ;
9. page `/mesure.html` derrière le mur, lisant la route.

Avant le code : 9 échecs sur 9 (route absente). Après : 9/9, et la suite
entière 78/78 (69 cas antérieurs inchangés), trois passages consécutifs ;
chaque cas passe aussi lancé seul. Douze contre-épreuves rendent chacune au
moins un cas rouge, puis la recette redevient verte après restauration : règle
« à cheval » retirée, décisions datées par `at`, journal sans périmètre, route
ouverte aux membres, clôture limitée au genre `closed`, ponctualité sur toute
échéance, absence rendue en zéro, bascule réduite à `derniere_reussite`,
fenêtres non réduites, réattribution limitée au genre `reassigned`, décisions
sans périmètre, événement inconnu d'un dossier privé lisible d'un superviseur.

Les prédicats de périmètre du journal et des décisions ont été déplacés de
`handleRest` vers deux fonctions partagées, au texte SQL près ; les 69 cas
antérieurs passent inchangés.

Exécution : `RADAR_TEST_ADMIN_URL=postgresql://…@127.0.0.1:…/postgres npm test`.

## Ce qui reste ouvert

- **Le relevé de production.** Aucun chiffre réel n'est reçu par cette
  recette. La bascule de production (première lecture La Barre, radar#8) date
  de quelques jours : les fenêtres seront courtes tant que `MESURE_BASCULE`
  n'est pas posée et que le temps n'a pas passé.
- **Le trigger et les statuts de l'interface.** Le désaccord entre la liste
  `closed`/`reopened` du trigger et les statuts terminaux de l'interface est
  contourné à la lecture, pas corrigé : les flux d'activité continuent
  d'afficher une clôture par Bouclé comme un changement de statut.
- **L'échelle.** Le relevé charge les dossiers et événements visibles ; son
  coût sur une grande instance n'est pas mesuré.
- **Les révisions** se reconnaissent au code : un dossier d'origine renommé
  après sa révision ne la retrouve plus.
- **La date de `closed_at`** est lue en UTC, comme `briefs/sla.html` ;
  l'interface écrit une date locale que PostgreSQL date selon son fuseau.
  Hors d'une base en UTC, une clôture peut changer de jour, ici comme dans
  `sla.html`.
