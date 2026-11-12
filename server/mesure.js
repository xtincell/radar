// ============================================================
//  RADAR — indicateurs avant/après (GET /mesure/avant-apres)
//  Arbitrage 5.6 du 12 novembre 2026 : mesurer, de part et d'autre du jour où
//  Radar a commencé à lire La Barre, ce que Radar sait réellement.
//
//  Trois familles, sur des fenêtres de même longueur autour de la bascule :
//    1. durée d'un dossier (ouverture → clôture, par brief_id) et ponctualité
//       (closed_at au plus tard le jour de l'échéance, comme briefs/sla.html) ;
//    2. décisions La Barre reçues (barre_decisions) : par verdict, retours par
//       dossier rattaché ; ce que les décisions ne portent pas est dit
//       « non calculable depuis Radar » ;
//    3. réouvertures, réattributions, changements d'échéance, révisions
//       (entrées de code PARENT.RN, server/ingest.js).
//
//  Règles (docs/RECEPTION-MESURE.md) :
//    • un dossier compte dans une fenêtre s'il y est ouvert ET clos ; ouvert
//      avant la bascule et clos après, il est « à cheval », compté à part ;
//    • chaque chiffre porte son assise n ; sans fait, la valeur est null avec
//      un motif — jamais un zéro ni une moyenne sur rien ;
//    • lecture seule, dans une transaction REPEATABLE READ : un relevé cohérent ;
//    • périmètre de l'appelant, réservé à owner, supervisor et à la clé machine :
//      mêmes prédicats que REST pour les dossiers, le journal et les décisions.
//  Aucune écriture, aucune tâche périodique, aucune dépendance.
// ============================================================
"use strict";
import { hasDb, initDb, transaction, taskEventScopeSql, decisionScopeSql } from "./pgrest.js";
import { briefScopeSql, taskAuthority } from "../functions/_authz.js";

const JOUR = 864e5;
export const JOURS_DEFAUT = 90;
const JOURS_MAX = 3650;

// Statuts de clôture. Le trigger (server/journal.sql) n'écrit « closed » et
// « reopened » que pour Livré, Clôturé, Terminé… ; l'interface (briefs/ui.js)
// clôt par Bouclé et tient aussi Validé, Envoyé dans Slack, Livré (cycle) et
// Archivé pour terminaux. Ces passages-là sont journalisés « status » : la
// clôture se lit donc dans la transition statut_old → statut_new que porte
// chaque événement, dont « closed »/« reopened » ne sont qu'un sous-ensemble.
export const STATUTS_CLOS = new Set(["Livré", "Livre", "Closed", "Clôturé", "Cloture", "Terminé", "Termine",
  "Envoyé dans Slack", "Livré (cycle)", "Validé", "Bouclé", "Archivé"]);
const GELES = new Set(["Frozen", "Gelé"]);
// Événements que le trigger écrit sur une modification de dossier. Le journal
// n'en note qu'un par écriture (le premier de statut → responsable → échéance
// → …) : les autres changements de la même écriture se lisent dans resp_old /
// resp_new et dans l'échéance de l'instantané (scope_snapshot).
const MODIFICATIONS = new Set(["status", "closed", "reopened", "frozen", "unfrozen", "reassigned",
  "deadline", "visibility", "renamed", "updated"]);
const VERDICTS = ["approuve", "reserve", "retour", "hors"];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/;
const REVISION = /^(.+)\.R\d+$/;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
});
const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
const r3 = x => Math.round(x * 1000) / 1000;
const texte = v => String(v ?? "").trim();
const moyenne = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
function mediane(xs) {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
// Un bloc sans fait : chaque valeur null, avec son motif.
const absent = (champs, motif) => ({ n: 0, ...Object.fromEntries(champs.map(k => [k, null])), motif });

export const DEFINITIONS = {
  bascule: "Jour où Radar a commencé à lire La Barre en production : MESURE_BASCULE si fournie (date ISO ; une date seule vaut minuit UTC), "
    + "sinon la plus ancienne preuve de lecture réussie (premier reçu écrit dans barre_recus, jamais réécrit ; à défaut, barre_lectures.derniere_reussite, provisoire car réécrite à chaque lecture reçue).",
  fenetre: "Deux fenêtres de même longueur, [bascule − L, bascule) et [bascule, bascule + L) ; L vaut la longueur demandée (90 jours par défaut), "
    + "réduite au temps écoulé depuis la bascule quand il est plus court, pour garder deux fenêtres égales.",
  ouverture: "Heure de l'événement « created » du dossier (entrée dans Radar), par brief_id ; pas la date de réception saisie.",
  cloture: "Heure de la dernière transition vers un statut terminal (Livré, Bouclé, Validé, Envoyé dans Slack, Livré (cycle), Archivé, Clôturé, Terminé…), "
    + "lue dans statut_old → statut_new ; le dossier doit être encore dans un statut terminal. Le genre « closed » du journal n'en couvre qu'une partie (dont_genre_closed).",
  dossier_dans_une_fenetre: "Ouvert et clos dans la fenêtre. Ouvert avant la bascule et clos après : « à cheval », compté à part, jamais dans l'une ou l'autre fenêtre. "
    + "Ouvert ou clos hors des deux fenêtres : hors fenêtre. Créé déjà clos (import), non clos, sans ouverture visible, exclu (Doublon, ≈, Archivé) ou supprimé : compté, sans indicateur.",
  faits_d_un_dossier: "Réouvertures, réattributions, changements d'échéance et révisions comptent entre l'ouverture du dossier et la fin de sa fenêtre "
    + "(la bascule pour « avant », la fin de « après », l'heure du calcul pour un dossier à cheval).",
  ponctualite: "Comme briefs/sla.html : à temps si la date (UTC) de closed_at est au plus tard l'échéance ; seules les échéances au format AAAA-MM-JJ comptent ; "
    + "l'échéance est celle du dossier aujourd'hui, reports compris.",
  reouverture: "Transition d'un statut terminal vers un statut ni terminal ni gelé.",
  reattribution: "Changement de responsable (resp_old → resp_new) sur une modification du dossier ; un responsable vide vaut sans responsable.",
  echeance: "Changement d'échéance d'un événement à l'autre (genre « deadline », ou instantané scope_snapshot) ; report : nouvelle date au format jour plus tardive.",
  revision: "Entrée de code PARENT.RN, comptée pour le dossier dont le code est PARENT si elle est créée entre son ouverture et la fin de sa fenêtre.",
  horloge_decisions: "Une décision La Barre se range par sa date quand (date de la décision), jamais par at (heure d'écriture dans Radar) ; "
    + "celle d'un dossier à cheval est mise à part avec lui.",
  rattachement: "Par la correspondance barre_projets (projet La Barre ↔ briefs.id) ; sans correspondance, la décision est comptée non rattachée ; aucun code ndeg n'est deviné.",
  confidentialite: "Périmètre de l'appelant, comme REST : dossiers selon private_to, journal et décisions selon les mêmes prédicats ; "
    + "un événement à confidentialité inconnue (private_to NULL) ne compte que pour qui le lit par REST.",
};

// ---- bascule ------------------------------------------------------------------
export function basculeDeclaree(valeur) {
  const v = texte(valeur);
  if (!v) return null;
  if (JOUR_ISO.test(v) || ISO.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return { date: d };
  }
  return { erreur: `MESURE_BASCULE illisible (« ${v.slice(0, 40)} ») : date ISO attendue, par exemple 2026-11-12 ou 2026-11-12T08:00:00Z ; aucune fenêtre calculée` };
}

async function lireBascule(client, env) {
  const declaree = basculeDeclaree(env?.MESURE_BASCULE);
  if (declaree?.erreur) return { date: null, source: null, provisoire: false, motif: declaree.erreur };
  if (declaree) return { date: declaree.date, source: "MESURE_BASCULE", provisoire: false, motif: "date fixée par l'installation (MESURE_BASCULE)" };
  const { rows: [r] } = await client.query(`select (select min(at) from barre_recus) as premier_recu,
    (select min(derniere_reussite) from barre_lectures) as reussite`);
  if (r.premier_recu && (!r.reussite || r.premier_recu <= r.reussite)) {
    return { date: r.premier_recu, source: "barre_recus.at", provisoire: false,
      motif: "première lecture réussie de La Barre qui a reçu des décisions (reçu jamais réécrit)" };
  }
  if (r.reussite) {
    return { date: r.reussite, source: "barre_lectures.derniere_reussite", provisoire: true,
      motif: "provisoire : aucune décision reçue, seule la dernière lecture réussie est connue et elle avance à chaque lecture reçue ; fixer MESURE_BASCULE" };
  }
  return { date: null, source: null, provisoire: false,
    motif: "aucune lecture réussie de La Barre et MESURE_BASCULE non fournie : pas de bascule, aucune fenêtre calculée" };
}

// ---- calcul pur -----------------------------------------------------------------
const exclu = d => d.entree === "Doublon" || texte(d.ndeg).startsWith("≈") || d.statut === "Archivé";
const estCloture = e => MODIFICATIONS.has(e.kind) && !STATUTS_CLOS.has(e.statut_old) && STATUTS_CLOS.has(e.statut_new);
const estReouverture = e => MODIFICATIONS.has(e.kind) && STATUTS_CLOS.has(e.statut_old)
  && !STATUTS_CLOS.has(e.statut_new) && !GELES.has(e.statut_new);
const estReattribution = e => MODIFICATIONS.has(e.kind) && texte(e.resp_old) !== texte(e.resp_new);

// Changements d'échéance d'un dossier, en suivant ses événements dans l'ordre
// d'écriture : un genre « deadline », ou deux instantanés successifs qui diffèrent.
function changementsEcheance(evts) {
  const out = [];
  let prec = null;
  for (const e of evts) {
    if (MODIFICATIONS.has(e.kind)) {
      const comparable = prec && prec.instantane && e.instantane;
      const ancienne = comparable ? texte(prec.echeance) : null, nouvelle = comparable ? texte(e.echeance) : null;
      if (e.kind === "deadline" || (comparable && ancienne !== nouvelle)) {
        out.push({ at: e.at.getTime(), kind: e.kind,
          report: comparable && JOUR_ISO.test(ancienne) && JOUR_ISO.test(nouvelle) && nouvelle > ancienne });
      }
    }
    prec = e;
  }
  return out;
}

function blocDossiers(liste, F, revisionsPar, motifVide) {
  const n = liste.length;
  if (!n) {
    return {
      duree: absent(["moyenne_jours", "mediane_jours", "dont_genre_closed"], motifVide),
      ponctualite: absent(["a_temps", "en_retard", "taux", "retard_moyen_jours", "non_comptes"], motifVide),
      reouvertures: absent(["dossiers_rouverts", "evenements", "part", "dont_genre_reopened"], motifVide),
      reattributions: absent(["dossiers", "evenements", "par_dossier", "dont_genre_reassigned"], motifVide),
      echeances: absent(["dossiers", "changements", "reports", "par_dossier", "dont_genre_deadline"], motifVide),
      revisions: absent(["revisions", "dossiers_revises", "par_dossier"], motifVide),
    };
  }
  const durees = liste.map(d => (d.C - d.O) / JOUR);
  const duree = { n, moyenne_jours: r1(moyenne(durees)), mediane_jours: r1(mediane(durees)),
    dont_genre_closed: liste.filter(d => d.genreCloture === "closed").length };

  // Ponctualité : l'échéance au format jour et closed_at, rien d'autre.
  const sansJour = liste.filter(d => !JOUR_ISO.test(texte(d.deadline)));
  const sansClos = liste.filter(d => JOUR_ISO.test(texte(d.deadline)) && !d.clos_jour);
  const comptes = liste.filter(d => JOUR_ISO.test(texte(d.deadline)) && d.clos_jour);
  const retards = comptes.filter(d => d.clos_jour > texte(d.deadline))
    .map(d => Math.round((Date.parse(d.clos_jour + "T00:00:00Z") - Date.parse(texte(d.deadline) + "T00:00:00Z")) / JOUR));
  const nonComptes = { sans_echeance_jour: sansJour.length, sans_closed_at: sansClos.length };
  const ponctualite = comptes.length
    ? { n: comptes.length, a_temps: comptes.length - retards.length, en_retard: retards.length,
        taux: r3((comptes.length - retards.length) / comptes.length),
        retard_moyen_jours: retards.length ? r1(moyenne(retards)) : null, non_comptes: nonComptes }
    : { ...absent(["a_temps", "en_retard", "taux", "retard_moyen_jours"],
        "aucun dossier de la fenêtre n’a à la fois une échéance au format AAAA-MM-JJ et un closed_at"), non_comptes: nonComptes };

  // Faits du dossier entre son ouverture et la fin de sa fenêtre.
  const dans = (d, at) => at >= d.O && at < F;
  let rouverts = 0, nReouv = 0, reouvGenre = 0, reattribues = 0, nReattr = 0, reattrGenre = 0;
  let echus = 0, nEch = 0, nReports = 0, echGenre = 0;
  for (const d of liste) {
    const reouv = d.evts.filter(e => estReouverture(e) && dans(d, e.at.getTime()));
    if (reouv.length) rouverts++;
    nReouv += reouv.length; reouvGenre += reouv.filter(e => e.kind === "reopened").length;
    const reattr = d.evts.filter(e => estReattribution(e) && dans(d, e.at.getTime()));
    if (reattr.length) reattribues++;
    nReattr += reattr.length; reattrGenre += reattr.filter(e => e.kind === "reassigned").length;
    const ech = changementsEcheance(d.evts).filter(c => dans(d, c.at));
    if (ech.length) echus++;
    nEch += ech.length; nReports += ech.filter(c => c.report).length; echGenre += ech.filter(c => c.kind === "deadline").length;
  }
  const origines = liste.filter(d => !REVISION.test(texte(d.ndeg)));
  let nRev = 0, revises = 0;
  for (const d of origines) {
    const recues = (revisionsPar.get(texte(d.ndeg)) || []).filter(at => dans(d, at));
    nRev += recues.length; if (recues.length) revises++;
  }
  return {
    duree, ponctualite,
    reouvertures: { n, dossiers_rouverts: rouverts, evenements: nReouv, part: r3(rouverts / n), dont_genre_reopened: reouvGenre },
    reattributions: { n, dossiers: reattribues, evenements: nReattr, par_dossier: r2(nReattr / n), dont_genre_reassigned: reattrGenre },
    echeances: { n, dossiers: echus, changements: nEch, reports: nReports, par_dossier: r2(nEch / n), dont_genre_deadline: echGenre },
    revisions: origines.length
      ? { n: origines.length, revisions: nRev, dossiers_revises: revises, par_dossier: r2(nRev / origines.length) }
      : absent(["revisions", "dossiers_revises", "par_dossier"], "aucun dossier d’origine (hors entrées de révision) dans la fenêtre"),
  };
}

function blocBarre(liste, motifVide) {
  if (!liste.length) {
    return { decisions: absent(["par_verdict", "rattachees", "non_rattachees", "sans_projet", "dossier_introuvable"], motifVide),
      retours_par_projet: absent(["retours", "dossiers_avec_retour", "par_dossier"], motifVide) };
  }
  const parVerdict = Object.fromEntries([...VERDICTS, "autre"].map(v => [v, 0]));
  for (const x of liste) parVerdict[VERDICTS.includes(x.verdict) ? x.verdict : "autre"]++;
  const de = r => liste.filter(x => x.rattachement === r).length;
  const decisions = { n: liste.length, par_verdict: parVerdict, rattachees: de("rattachee"), non_rattachees: de("non_rattachee"),
    sans_projet: de("sans_projet"), dossier_introuvable: de("dossier_introuvable") };
  const parDossier = new Map();
  for (const x of liste.filter(x => x.rattachement === "rattachee")) {
    const id = Number(x.brief_id);
    parDossier.set(id, (parDossier.get(id) || 0) + (x.verdict === "retour" ? 1 : 0));
  }
  const nb = parDossier.size, retours = [...parDossier.values()].reduce((a, b) => a + b, 0);
  return { decisions, retours_par_projet: nb
    ? { n: nb, retours, dossiers_avec_retour: [...parDossier.values()].filter(v => v > 0).length, par_dossier: r2(retours / nb) }
    : absent(["retours", "dossiers_avec_retour", "par_dossier"], "aucune décision rattachée à un dossier Radar dans la fenêtre") };
}

// Entrées : lignes déjà filtrées au périmètre de l'appelant. Dates en Date.
export function calculer({ dossiers, evenements, activite, decisions, bascule, longueur, maintenant }) {
  const B = bascule.getTime(), A0 = B - longueur, A1 = B + longueur, now = maintenant.getTime();
  const cote = t => (t >= A0 && t < B ? "avant" : t >= B && t < A1 ? "apres" : null);

  const parId = new Map(dossiers.map(d => [Number(d.id), { ...d, id: Number(d.id), evts: [] }]));
  const supprimes = new Set();
  for (const e of evenements) {
    const d = parId.get(Number(e.brief_id));
    if (d) d.evts.push(e); else if (e.kind === "deleted") supprimes.add(Number(e.brief_id));
  }

  const comptes = { avant: 0, apres: 0, a_cheval: 0, hors_fenetre: 0, non_clos: { n: 0, ouverts_avant_bascule: 0, ouverts_depuis: 0 },
    sans_ouverture: 0, cree_clos: 0, exclus: 0, supprimes: supprimes.size };
  const groupes = { avant: [], apres: [], a_cheval: [] };
  const classe = new Map();
  for (const d of parId.values()) {
    if (exclu(d)) { comptes.exclus++; continue; }
    const creation = d.evts.find(e => e.kind === "created");
    if (!creation) { comptes.sans_ouverture++; continue; }
    if (STATUTS_CLOS.has(creation.statut_new)) { comptes.cree_clos++; continue; }
    d.O = creation.at.getTime();
    const derniere = d.evts.filter(estCloture).at(-1);
    if (!STATUTS_CLOS.has(d.statut) || !derniere) {
      comptes.non_clos.n++;
      if (d.O < B) comptes.non_clos.ouverts_avant_bascule++; else comptes.non_clos.ouverts_depuis++;
      continue;
    }
    d.C = derniere.at.getTime(); d.genreCloture = derniere.kind;
    const g = d.C < d.O ? null
      : d.O < B && d.C >= B ? "a_cheval"
      : d.O >= A0 && d.C < B ? "avant"
      : d.O >= B && d.C < A1 ? "apres" : null;
    if (!g) { comptes.hors_fenetre++; continue; }
    comptes[g]++; groupes[g].push(d); classe.set(d.id, g);
  }

  // Révisions : une entrée PARENT.RN visible, datée par sa création, pour le
  // dossier visible dont le code est PARENT ; sinon sans dossier d'origine.
  const codes = new Set([...parId.values()].map(d => texte(d.ndeg)).filter(Boolean));
  const revisionsPar = new Map();
  let sansOrigine = 0;
  for (const d of parId.values()) {
    const m = texte(d.ndeg).match(REVISION);
    if (!m || exclu(d)) continue;
    if (!codes.has(m[1])) { sansOrigine++; continue; }
    const creation = d.evts.find(e => e.kind === "created");
    if (!creation) continue;
    if (!revisionsPar.has(m[1])) revisionsPar.set(m[1], []);
    revisionsPar.get(m[1]).push(creation.at.getTime());
  }

  const avantVide = activite.avant === 0;
  const motifAvant = avantVide
    ? "fenêtre avant vide : aucun événement du journal sur la période — l’équipe n’utilisait peut-être pas Radar"
    : "aucun dossier ouvert et clos dans la fenêtre avant";
  const blocs = {
    avant: blocDossiers(groupes.avant, B, revisionsPar, motifAvant),
    apres: blocDossiers(groupes.apres, A1, revisionsPar, "aucun dossier ouvert et clos dans la fenêtre après"),
    a_cheval: blocDossiers(groupes.a_cheval, now, revisionsPar, "aucun dossier à cheval sur la bascule"),
  };

  // Décisions La Barre : courantes, datées par quand.
  const parGroupe = { avant: [], apres: [], a_cheval: [] };
  const barre = { sans_date: 0, retirees: 0, hors_fenetre: 0 };
  for (const x of decisions) {
    if (x.etat !== "recue") { barre.retirees++; continue; }
    if (!x.quand) { barre.sans_date++; continue; }
    const g = x.brief_id != null && classe.get(Number(x.brief_id)) === "a_cheval" ? "a_cheval" : cote(x.quand.getTime());
    if (!g) { barre.hors_fenetre++; continue; }
    parGroupe[g].push(x);
  }
  blocs.avant.barre = blocBarre(parGroupe.avant, avantVide ? motifAvant : "aucune décision La Barre datée dans la fenêtre avant");
  blocs.apres.barre = blocBarre(parGroupe.apres, "aucune décision La Barre datée dans la fenêtre après");
  blocs.a_cheval.barre = blocBarre(parGroupe.a_cheval, "aucune décision sur un dossier à cheval");
  barre.non_calculable = {
    taux_reprise_versions: { valeur: null, motif: "non calculable depuis Radar : les versions et pistes d’un livrable restent dans La Barre ; Radar ne reçoit que les décisions" },
    tours_au_dela_du_vendu: { valeur: null, motif: "non calculable depuis Radar : le nombre de tours vendus n’est pas transmis avec les décisions" },
  };

  return {
    dossiers: comptes,
    journal: { evenements: { avant: activite.avant, apres: activite.apres }, non_attribues: activite.non_attribues, avant_vide: avantVide,
      ...(avantVide ? { motif: motifAvant } : {}) },
    ...blocs,
    barre,
    revisions_sans_origine: sansOrigine,
  };
}

// ---- route ----------------------------------------------------------------------
export async function handleMesure(context) {
  if (!hasDb()) return json({ message: "base non configurée" }, 503);
  if (!await initDb()) return json({ message: "base indisponible" }, 503);
  const who = taskAuthority(context);
  if (!who.fullAccess && who.role !== "owner" && who.role !== "supervisor") return json({ message: "réservé aux superviseurs" }, 403);
  const brut = new URL(context.request.url).searchParams.get("jours");
  let jours = JOURS_DEFAUT;
  if (brut !== null) {
    if (!/^\d+$/.test(brut) || Number(brut) < 1 || Number(brut) > JOURS_MAX) return json({ message: `jours : entier de 1 à ${JOURS_MAX}` }, 400);
    jours = Number(brut);
  }
  const perimetre = { role: who.fullAccess ? "machine" : who.role,
    regle: "chiffres calculés sur ce que l’appelant voit : dossiers, journal et décisions hors de son périmètre ne sont ni comptés ni signalés" };

  try {
    const releve = await transaction(async client => {
      // Un seul instantané de la base pour tout le relevé ; rien n'est écrit.
      await client.query("set transaction isolation level repeatable read, read only");
      const maintenant = (await client.query("select now() as t")).rows[0].t;
      const bascule = await lireBascule(client, context.env);
      const base = { schema: 1, calcule_le: maintenant.toISOString(), perimetre,
        bascule: { ...bascule, date: bascule.date ? bascule.date.toISOString() : null }, fenetres: null,
        dossiers: null, journal: null, avant: null, apres: null, a_cheval: null, barre: null, revisions_sans_origine: null,
        definitions: DEFINITIONS };
      if (!bascule.date) return base;
      const B = bascule.date.getTime(), ecoule = maintenant.getTime() - B;
      if (ecoule <= 0) {
        base.bascule.motif = "bascule à venir (" + base.bascule.date + ") : pas encore de fenêtre après, aucune fenêtre calculée";
        return base;
      }
      const demandee = jours * JOUR, longueur = Math.min(demandee, ecoule);
      const iso = t => new Date(t).toISOString();
      base.fenetres = { longueur_demandee_jours: jours, longueur_jours: r2(longueur / JOUR), tronquee: longueur < demandee,
        ...(longueur < demandee ? { motif: `la bascule date de ${r1(ecoule / JOUR)} jour(s) : fenêtres réduites à cette durée de part et d’autre` } : {}),
        avant: { debut: iso(B - longueur), fin: iso(B) }, apres: { debut: iso(B), fin: iso(B + longueur) } };

      const pb = [];
      const dossiers = (await client.query(`select b.id, b.ndeg, b.statut, b.entree, b.deadline,
          to_char(b.closed_at at time zone 'UTC', 'YYYY-MM-DD') as clos_jour
        from briefs b where ${briefScopeSql(context, pb, "b.")}`, pb)).rows;
      const pe = [];
      const evenements = (await client.query(`select e.id, e.at, e.brief_id, e.kind, e.statut_old, e.statut_new, e.resp_old, e.resp_new,
          e.scope_snapshot is not null as instantane, e.scope_snapshot->>'deadline' as echeance
        from task_events e where e.brief_id is not null and ${taskEventScopeSql(context, pe, "e")}
        order by e.brief_id, e.id`, pe)).rows;
      const pa = [];
      const scope = taskEventScopeSql(context, pa, "e");
      pa.push(new Date(B - longueur), new Date(B), new Date(B + longueur));
      const n = pa.length;
      const activite = (await client.query(`select
          count(*) filter (where e.at >= $${n - 2} and e.at < $${n - 1})::int as avant,
          count(*) filter (where e.at >= $${n - 1} and e.at < $${n})::int as apres,
          count(*) filter (where e.brief_id is null)::int as non_attribues
        from task_events e where ${scope}`, pa)).rows[0];
      const pd = [];
      const decisions = (await client.query(`select d.decision_id, d.etat, d.verdict, d.quand, d.brief_id, d.rattachement
        from barre_decisions d where d.courante and ${decisionScopeSql(context, pd, "d")}`, pd)).rows;

      return { ...base, ...calculer({ dossiers, evenements, activite, decisions, bascule: bascule.date, longueur, maintenant }) };
    });
    return json(releve);
  } catch (e) {
    console.error("[mesure]", e && e.message);
    return json({ message: "erreur SQL" }, 500);
  }
}
