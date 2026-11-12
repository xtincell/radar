# Lecture des décisions La Barre

SHK-0005 posait trois sens de flux entre La Barre et Radar. L'arbitrage 5.5 du
11 novembre 2026 retient le sens 1 : Radar lit les décisions de La Barre. Ce
document dit ce que la branche reçoit, et ce qu'elle ne reçoit pas.

## Choix retenus

- La Barre sert les seules décisions sur `GET /radar/decisions`, derrière un
  jeton machine (`BARRE_RADAR_TOKEN`, au moins 32 caractères), comparé en temps
  constant ; sans jeton, la route est fermée (`503`). La forme est celle de la
  fabrique `app/decision.js`, réduite aux champs qui datent et attribuent une
  décision, avec une empreinte de contenu et un `ETag`.
- Radar lit à intervalle (`server/barre.js`), tient un reçu par (instance La
  Barre, `decision.id`, version) et ne réécrit ni n'efface rien : une décision
  changée devient une version, une décision disparue une version `retiree`.
- La correspondance projet La Barre ↔ (instance Radar, `briefs.id`) se tient
  dans Radar par un superviseur. Sans elle, une décision reste non rattachée ;
  aucun code `ndeg` n'est deviné.
- Les décisions restent privées : ni `briefs`, ni `task_events`, ni flux public.
- `quand`, la date de la décision, a sa colonne ; `at` reste l'heure d'écriture
  dans Radar.

## Recette locale

Base PostgreSQL 16 jetable, La Barre simulée par un serveur local qui suit le
contrat de la route ; aucune installation, aucun dossier réel.

`tests/barre.test.mjs` reçoit 12 cas : lecteur désactivé sans adresse ou sans
jeton suffisant ; date propre, auteur déclaré et empreinte conservés ; rejeu sans
doublon, avec ou sans `ETag` ; trois lectures concurrentes sans doublon ;
nouvelle version sur changement ; décision non rattachée malgré un dossier au
code homonyme ; retrait et remplacement notés, retour d'une décision retirée,
changement de base sans retrait ; réponse refusée, illisible ou altérée sans
écriture ; lecture périodique par le serveur, reprise de l'`ETag` après
redémarrage, flux public et journal inchangés ; lecture réservée aux
superviseurs dans le périmètre de confidentialité ; correspondance tenue par un
superviseur ; serveur sans lecteur quand la configuration manque.

Avant le code, les 12 cas échouaient. Après : 12/12, et la suite entière 57/57
(45 cas antérieurs), six passages consécutifs. Six contre-épreuves ont rendu la
recette rouge en retirant une garantie à la fois — empreinte inchangée,
même base de référence, contrôle de l'empreinte, périmètre de confidentialité,
réservation aux superviseurs, décisions écartées — puis verte après
restauration.

Exécution : `RADAR_TEST_ADMIN_URL=postgresql://…@127.0.0.1:…/postgres npm test`.

## Ce qui reste ouvert

- La mesure avant/après et ses indicateurs (arbitrage 5.6) : la lecture rend la
  mesure possible, elle ne la calcule pas.
- La publication des décisions : l'arbitrage 5.7 (12 novembre) garde les flux
  privés par défaut ; les décisions n'y entrent pas, publiées ou non.
- Le chemin réseau en production entre Radar et La Barre, et l'exposition de la
  seule route `/radar/decisions` : rien n'est déployé, aucun jeton n'est posé.
- L'attestation de La Fusée ne part pas vers Radar ; l'auteur reste déclaré.
- Les changements de correspondance ne sont pas journalisés.
- `ndeg` est unique depuis le geste 4.4 ([RECEPTION-UNICITE-FLUX.md](RECEPTION-UNICITE-FLUX.md)) ;
  ce câblage ne s'en sert toujours pas : la correspondance nomme `briefs.id`.
