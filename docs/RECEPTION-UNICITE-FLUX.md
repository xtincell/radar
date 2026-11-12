# Codes uniques et flux privés

Geste 4.4 du plan, sur l'arbitrage 5.7 du 12 novembre 2026 : `ndeg` unique par
instance, homonymes dédoublonnés sans perte ; flux privés par défaut ; les 125
événements anciens à confidentialité inconnue traités comme privés jusqu'à
relecture. Ce document dit ce que la branche reçoit, et ce qu'elle ne reçoit pas.

## Choix retenus

- **Unicité en base.** Contrainte `briefs_ndeg_unique` posée par
  `server/ndeg.sql`, appliqué à chaque démarrage dans la transaction de
  `initDb`, après le semis éventuel. La contrainte présente, rien ne change.
- **Dédoublonnage sans perte.** Par code, le dossier le plus ancien
  (`created_at`, puis `id`, date inconnue en dernier) garde le code ; les
  suivants reçoivent `X-2`, `X-3`… par ordre de création, en sautant tout code
  déjà employé par un dossier, un commentaire, un visuel ou un événement. Un
  code vide en double devient NULL. Chaque renommage est inscrit dans
  `briefs_ndeg_renommes` et produit un événement `renamed` (« Code X → Y »)
  qui porte la confidentialité du dossier. Aucune ligne n'est supprimée.
- **Anciens rattachements par code.** Les commentaires et visuels rattachés par
  `brief_id` suivent le nouveau code. Ceux qui n'avaient que le code, vers un
  code en double, ne sont attribués à personne (`ndeg_ambigu`) : avant la
  migration, ils étaient déjà invisibles et refusés en écriture ; ils le restent.
- **API.** Pas d'upsert : le contrat est un INSERT. Un code déjà pris reçoit
  `409` avec `{message, ndeg}`, sans dossier ni événement, sans révéler le
  dossier qui le porte. `PATCH`/`DELETE` sur `ndeg=eq.X` touchent un dossier.
  L'interface (`briefs/ticket.html`) traitait déjà le `409` ; Galahad et
  `talos/radar-mcp` gardent leurs filtres `ndeg=eq.X`.
- **Rien de public par défaut** (`functions/_publication.js`). Les flux
  `/feed.xml` et `/activity.json` s'ouvrent par `FEED_PUBLIC=1` ou aux
  détenteurs de `FEED_TOKEN` ; sinon ils sont derrière le mur, aperçu pour
  `owner`, `supervisor` et la clé machine. `/jour.html` et `/jour.json`
  s'ouvrent par `JOUR_PUBLIC=1` ; sinon `/jour.json` suit le périmètre de rôle.
  Le contenu publié ne change pas : mouvements publics qualifiés seulement.
- **Événements anciens.** `private_to` NULL = privé jusqu'à relecture : absent
  de tout flux, même publié ; invisible d'un membre ; lisible d'`owner` et de
  `supervisor`. `POST /journal/revue` (responsables et clé machine) les
  qualifie « public » ou « prive » à une personne, tout ou rien, avec
  `revue_par` et `revue_le`. « public » est refusé quand le dossier qui porte
  aujourd'hui ce code est privé.

## Recette locale

PostgreSQL 16.15 jetable (cluster créé puis supprimé), Node 22 ; aucune
installation ni dossier réel.

`tests/ndeg.test.mjs` part d'une base qui imite une instance déjà déployée :
schéma antérieur, index non unique, trois `DUP-1` insérés hors de leur ordre
de création, un code `DUP-1-2` déjà pris par un dossier, `DUP-1-3` par un
commentaire orphelin, `DUP-1-5` par un ancien événement, deux codes vides,
deux NULL, une date de création inconnue, un dossier privé, des commentaires et
visuels liés ou non. Six cas : codes attribués (`DUP-1-4`, `DUP-1-6`, `PAIR-2`,
`NUL-DATE-2`, vide → NULL), toutes colonnes hors `ndeg` identiques et trace
exacte ; événements antérieurs identiques, cinq `renamed` dont celui du dossier
privé invisible d'un superviseur ; liens qualifiés suivis, anciens liens ambigus
conservés et non attribués (REST, binaire, écriture `409`) ; migration rejouée
deux fois puis redémarrage sans aucune différence ; POST rejoué, lot répété,
code privé et cinq POST simultanés : un seul dossier, un seul événement ;
PATCH/DELETE par code sur un seul dossier, vol de code refusé.

`tests/flux.test.mjs` : six cas — configuration fermée par défaut ; sans choix,
anonyme `401` sur les quatre routes, membre `403`, aperçu des responsables sans
CORS, vue du jour au périmètre, et rien de public même sans mur ; `FEED_TOKEN`
seul ; `FEED_PUBLIC` et `JOUR_PUBLIC` sans les événements anciens ; anciens
lisibles des responsables, pas d'un membre ; revue avec ses refus (membre,
corps, type de contenu, inconnu, déjà qualifié, lot mixte, code privé, hors
périmètre) sans écriture, puis publication et correction protectrice.

Trois cas existants sont ajustés : la recette de `reception` publie son flux
explicitement (`FEED_PUBLIC=1`) ; les 125 anciens événements sont lus par les
responsables et pas par un membre ; le cas « code ambigu » vérifie désormais le
refus du doublon et l'ancien visuel marqué ambigu. `barre` publie flux et vue
du jour pour que « aucune décision n'y passe » garde un sens.

Avant le code : 13 échecs sur 69 (les 11 nouveaux cas qui décrivent un
changement, plus les deux cas ajustés de `reception`). Après : 69/69. Sept
contre-épreuves rendent chacune au moins un cas rouge : codes déjà employés non
réservés, ancien lien ambigu rattaché, ordre par `id` au lieu de la création,
flux public par défaut, anciens invisibles des responsables, publication d'un
code privé, vue du jour sans périmètre. Fichiers restaurés ensuite.

Échelle, hors CI : sur 10 000 dossiers dont 1 000 homonymes, 100 000 événements
et 10 000 anciens commentaires, le démarrage complet prend 5,3 s ; chaque code
attribué est vérifié contre le journal sans index sur `task_events.ndeg`.

Exécution : `RADAR_TEST_ADMIN_URL=postgresql://…@127.0.0.1:…/postgres npm test`.

## Au déploiement

Le premier démarrage applique la migration et écrit ses comptes :
`[pgrest] unicité ndeg posée · N code(s) en double, M dossier(s) renommé(s),
K ancien(s) rattachement(s) ambigu(s) …`. Le verrou sur `briefs` dure le temps
de la migration. Sans `FEED_PUBLIC`, `FEED_TOKEN` ni `JOUR_PUBLIC`, les flux et
la vue du jour cessent d'être publics : une installation qui veut les garder
pose la variable correspondante.

## Ce qui reste ouvert

- La relecture des 125 événements de l'instance personnelle : la route existe,
  les décisions restent à prendre.
- Les anciens commentaires et visuels sans `brief_id` restent à qualifier ; ceux
  marqués ambigus n'ont pas de route de rattachement.
- Un code se compare à l'identique : `X` et `X ` restent deux codes.
- La réception en production de la migration (comptes réels), de la CI et de
  l'image n'est pas faite par cette recette.
