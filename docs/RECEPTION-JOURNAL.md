# Journal et frontières de données

Le suivi est utile au Shinkiro si un mouvement et sa trace sont reçus ensemble,
quelle que soit l'entrée : interface, import, API ou commande SQL autorisée.
Un journal réécrit par le client ou détaché de la confidentialité du dossier
ne peut pas constituer un reçu de circulation des décisions.

Les fichiers concernés correspondent au code déployé ; cinq écarts ont été
reproduits sur une base locale jetable : un HTTP
201 malgré le rollback provoqué par l'échec du journal ; un dossier vide créé
par un corps sans colonne reconnue ; un journal modifiable par REST ; un
événement privé dans le flux public ; un binaire privé accessible par son nom.
Le runtime personnel possède actuellement 77 briefs, aucun marqué privé, et
125 événements anciens. Ce constat ne prouve pas une divulgation réelle.

La revue des mêmes chemins a également corrigé le filtrage des commentaires,
la modification REST du nom ou du rattachement d'un média (seule la légende
est modifiable), et les mutations sans filtre explicite. Le filtre de
confidentialité ajouté automatiquement ne vaut pas une sélection de mutation.

La correction factorise le journal des briefs dans un trigger PostgreSQL.
L'échec d'un événement fait échouer l'écriture correspondante. Les médias
conservent leur événement dans la même transaction que leurs métadonnées.
Le journal REST est en lecture seule et un corps sans colonne reconnue est
refusé avant toute insertion.

Deux champs complètent le journal existant : `brief_id` conserve le rattachement
stable ; `private_to` conserve la confidentialité au moment du mouvement.
Le lecteur vérifie aussi le dossier courant. Les événements anciens restent
conservés avec confidentialité inconnue ; ils ne sont pas rendus publics ou
à d'autres utilisateurs par déduction. Le flux et l'interface signalent leur
nombre. Leur qualification historique reste une opération à recevoir.
Une suppression privée conserve cette barrière pour le journal précédent.
Le repli vers un ancien PostgREST sans ce contrat ne publie plus d'événements
non qualifiés : il retourne une indisponibilité explicite.

La recette HTTP utilise PostgreSQL local jetable, un ancien journal de 125
lignes et un simulateur Ollama local. Elle reçoit 19 cas : atomicité du dossier,
des lots et des médias, absence de faux succès, confidentialité des lecteurs,
changements de visibilité, suppression, réutilisation de code, refus des codes
ambigus, conservation de l'histoire et redémarrage sans rejeu. Aucun dossier
client, canal externe ni fournisseur réel n'est utilisé par ces tests.

Exécution : `RADAR_TEST_ADMIN_URL=postgresql://…@127.0.0.1:…/postgres npm test`.
La connexion doit autoriser la création d'une base locale jetable ; le test
refuse toute cible distante et détruit uniquement sa propre base de recette.

Cette correction ne reçoit ni un raccord La Barre → Radar idempotent, ni
l'arbitrage de clôture avec fichier client, ni les permissions métier complètes
par rôle. Un événement « closed » décrit un état saisi ; il ne prouve pas la
livraison d'un fichier ou l'accord d'un client. Les codes de brief non uniques,
les accès machine de portée générale et la concurrence des imports restent
à recevoir dans le contrat d'irrigation.
