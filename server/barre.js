// ============================================================
//  RADAR — lecteur des décisions La Barre
//  SHK-0005, sens 1, arbitrage 5.5 du 11 novembre 2026 : Radar va chercher les
//  décisions sur la route GET /radar/decisions de La Barre, avec un jeton
//  machine, à intervalle. Il ne lit que cette route : ni le dépôt entier, ni
//  les personnes, ni la facturation.
//
//  Ce qu'il écrit (server/barre.sql), dans une seule transaction par lecture :
//    • barre_recus   — un reçu par (instance La Barre, decision.id, version).
//                      Même empreinte : rien. Empreinte changée : version
//                      suivante, l'ancienne reste. Décision absente de la même
//                      base de référence : version « retiree », jamais effacée.
//    • barre_lectures — l'ETag (reprise après redémarrage), la base lue, le
//                      compte rendu de la dernière lecture.
//  Il n'écrit ni dans briefs, ni dans task_events : une décision ne part pas
//  dans le flux public. Il ne rattache rien : le rattachement se lit dans la
//  vue barre_decisions, depuis la correspondance barre_projets tenue par un
//  superviseur. Une décision sans correspondance reste « non rattachée » ; aucun
//  code ndeg n'est deviné. `quand` garde la date de la décision ; `at` est
//  l'heure d'écriture dans Radar.
// ============================================================
"use strict";
import { createHash } from "node:crypto";
import { hasDb, initDb, query, transaction } from "./pgrest.js";

const JETON_MIN = 32;                  // même seuil que La Barre
const INTERVALLE_DEFAUT_MIN = 15;
const TAILLE_MAX = 32 * 1024 * 1024;   // le dépôt La Barre plafonne à 24 Mo
const DELAI_MS = 30000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;

// ---- configuration ----------------------------------------------------------
// BARRE_URL          adresse de base de La Barre (la route y est ajoutée)
// BARRE_RADAR_TOKEN  jeton machine, le même que celui de La Barre (≥ 32 caractères)
// BARRE_INSTANCE     nom stable de l'installation La Barre dans les reçus ;
//                    défaut : l'hôte de BARRE_URL
// BARRE_INTERVAL_MIN minutes entre deux lectures (défaut 15, plancher 1 s) ;
//                    0 désactive le lecteur
export function barreConfig(env = process.env) {
  const brut = String(env.BARRE_URL || "").trim();
  const token = String(env.BARRE_RADAR_TOKEN || "");
  let route = null, instance = String(env.BARRE_INSTANCE || "").trim();
  if (brut) {
    try {
      const base = new URL(brut.endsWith("/") ? brut : brut + "/");
      if (base.protocol === "http:" || base.protocol === "https:") {
        route = new URL("radar/decisions", base).href;
        if (!instance) instance = base.host;
      }
    } catch { route = null; }
  }
  const minutesBrutes = env.BARRE_INTERVAL_MIN;
  const minutes = minutesBrutes === undefined || String(minutesBrutes).trim() === "" ? INTERVALLE_DEFAUT_MIN : Number(minutesBrutes);
  const intervalMs = Number.isFinite(minutes) && minutes > 0 ? Math.max(1000, Math.round(minutes * 60000)) : 0;
  const raison = !brut ? "BARRE_URL absent"
    : !route ? "BARRE_URL illisible (http ou https attendu)"
    : token.length < JETON_MIN ? `BARRE_RADAR_TOKEN absent ou de moins de ${JETON_MIN} caractères`
    : !intervalMs ? "BARRE_INTERVAL_MIN nul ou illisible"
    : null;
  return { route, token, instance, intervalMs, actif: !raison, raison };
}

// ---- contrat de la route La Barre --------------------------------------------
// Même canonisation que servir.mjs : clés triées à toutes les profondeurs, sans
// espace. L'empreinte couvre tous les champs servis sauf elle-même.
export function canonique(v) {
  if (Array.isArray(v)) return "[" + v.map(canonique).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonique(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}
function empreinteDe(decision) {
  const sans = { ...decision }; delete sans.empreinte_contenu;
  return "sha256:" + createHash("sha256").update(canonique(sans)).digest("hex");
}
function sansEmpreinte(decision) { const c = { ...decision }; delete c.empreinte_contenu; return c; }
const texte = (v) => (typeof v === "string" ? v : v == null ? null : JSON.stringify(v));
const identifiantLisible = (v) => typeof v === "string" && v.trim() !== "" && v.length <= 200;

// Une décision n'est reçue que lisible et intacte. Une décision refusée n'est
// pas une décision retirée : son identifiant compte parmi les présents.
function examiner(d, vus) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return { refus: "pas un objet" };
  if (!identifiantLisible(d.id)) return { refus: "identifiant illisible" };
  if (vus.has(d.id)) return { id: d.id, refus: "identifiant servi deux fois" };
  vus.add(d.id);
  if (d.projet != null && typeof d.projet !== "string") return { id: d.id, refus: "projet illisible" };
  if (typeof d.empreinte_contenu !== "string" || d.empreinte_contenu !== empreinteDe(d)) {
    return { id: d.id, refus: "empreinte de contenu discordante" };
  }
  return { id: d.id };
}

async function texteBorne(reponse) {
  const lecteur = reponse.body.getReader();
  const morceaux = []; let n = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    n += value.length;
    if (n > TAILLE_MAX) { await lecteur.cancel().catch(() => {}); throw new Error("réponse trop volumineuse"); }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux).toString("utf8");
}

// ---- compte rendu ------------------------------------------------------------
async function noter(client, instance, champs) {
  const cols = ["barre_instance", ...Object.keys(champs)];
  const vals = [instance, ...Object.values(champs)];
  const ph = cols.map((_, i) => "$" + (i + 1)).join(",");
  const maj = Object.keys(champs).map((k) => `${k} = excluded.${k}`).join(",");
  await client.query(`insert into barre_lectures (${cols.join(",")}) values (${ph})
    on conflict (barre_instance) do update set ${maj}`, vals);
}
async function echec(cfg, message) {
  try { await noter({ query }, cfg.instance, { lu_le: new Date().toISOString(), statut: "echec", message }); }
  catch (e) { message += " (compte rendu non enregistré : " + (e && e.message) + ")"; }
  return { statut: "echec", message };
}

// ---- une lecture -------------------------------------------------------------
export async function lireBarre(cfg = barreConfig(), { fetchImpl = fetch, delaiMs = DELAI_MS } = {}) {
  if (!cfg.actif) return { statut: "desactive", raison: cfg.raison };
  if (!hasDb() || !await initDb()) return { statut: "echec", message: "base Radar indisponible" };
  const etat = (await query("select etag from barre_lectures where barre_instance=$1", [cfg.instance])).rows[0] || {};

  let reponse;
  try {
    reponse = await fetchImpl(cfg.route, {
      headers: { Authorization: "Bearer " + cfg.token, Accept: "application/json", ...(etat.etag ? { "If-None-Match": etat.etag } : {}) },
      // Une redirection pourrait emporter le jeton ailleurs : refusée.
      redirect: "error", signal: AbortSignal.timeout(delaiMs),
    });
  } catch (e) { return echec(cfg, "La Barre injoignable : " + ((e && e.message) || e)); }

  if (reponse.status === 304) {
    await noter({ query }, cfg.instance, { lu_le: new Date().toISOString(), statut: "inchange", message: null });
    return { statut: "inchange" };
  }
  if (reponse.status !== 200) {
    await reponse.body?.cancel().catch(() => {});
    return echec(cfg, "La Barre a répondu " + reponse.status);
  }
  let corps;
  try { corps = JSON.parse(await texteBorne(reponse)); }
  catch (e) { return echec(cfg, "réponse illisible : " + ((e && e.message) || e)); }
  if (!corps || typeof corps !== "object" || corps.schema !== 1 || typeof corps.depot !== "string" || !corps.depot
      || !Array.isArray(corps.decisions) || (corps.ecartees !== undefined && !Array.isArray(corps.ecartees))) {
    return echec(cfg, "réponse hors contrat (schema 1, depot, decisions attendus)");
  }

  const vus = new Set(), acceptees = [], refus = [];
  for (const d of corps.decisions) {
    const verdict = examiner(d, vus);
    if (verdict.refus) refus.push(verdict); else acceptees.push(d);
  }
  const ecartees = (corps.ecartees || []).filter((e) => e && typeof e === "object");
  // Présentes : servies (reçues ou refusées) ou nommées écartées par La Barre.
  const presents = new Set([...vus, ...ecartees.map((e) => e.id).filter(identifiantLisible)]);
  const etag = reponse.headers.get("etag");

  return transaction(async (client) => {
    // Deux lectures simultanées (deux processus, ou un rejeu) se suivent.
    await client.query("select pg_advisory_xact_lock(hashtext($1))", ["barre:" + cfg.instance]);
    const avant = (await client.query("select depot from barre_lectures where barre_instance=$1", [cfg.instance])).rows[0];
    const precedentes = (await client.query(`select distinct on (decision_id) * from barre_recus
      where barre_instance=$1 order by decision_id, version desc`, [cfg.instance])).rows;
    const parId = new Map(precedentes.map((r) => [r.decision_id, r]));
    const compte = { recues: acceptees.length, nouvelles: 0, versions: 0, inchangees: 0, retirees: 0,
      refusees: refus.length, ecartees: ecartees.length };
    const inserer = (r) => client.query(`insert into barre_recus (barre_instance, decision_id, version, etat, empreinte,
      projet, quand, quand_declare, type, verdict, titre, motif, qui, acteur, remplace, contenu)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, [cfg.instance, r.decision_id, r.version, r.etat,
      r.empreinte, r.projet, r.quand, r.quand_declare, r.type, r.verdict, r.titre, r.motif, r.qui,
      r.acteur == null ? null : JSON.stringify(r.acteur), r.remplace, r.contenu == null ? null : JSON.stringify(r.contenu)]);

    for (const d of acceptees) {
      const prev = parId.get(d.id);
      if (prev && prev.etat === "recue" && prev.empreinte === d.empreinte_contenu) { compte.inchangees++; continue; }
      const quandDeclare = texte(d.quand);
      await inserer({ decision_id: d.id, version: prev ? prev.version + 1 : 1, etat: "recue", empreinte: d.empreinte_contenu,
        projet: d.projet || null, quand: quandDeclare && ISO.test(quandDeclare) && !isNaN(Date.parse(quandDeclare)) ? quandDeclare : null,
        quand_declare: quandDeclare, type: texte(d.type), verdict: texte(d.verdict), titre: texte(d.titre), motif: texte(d.motif),
        qui: texte(d.qui), acteur: d.acteur ?? null, remplace: texte(d.remplace), contenu: sansEmpreinte(d) });
      if (prev) compte.versions++; else compte.nouvelles++;
    }

    // Un retrait ne se déduit que d'une même base de référence relue : une autre
    // base, ou une première lecture, ne retire rien.
    let message = refus.length ? refus.length + " décision(s) refusée(s) : "
      + refus.slice(0, 5).map((r) => (r.id || "?") + " (" + r.refus + ")").join(", ") : null;
    if (avant && avant.depot === corps.depot) {
      for (const prev of precedentes) {
        if (prev.etat !== "recue" || presents.has(prev.decision_id)) continue;
        await inserer({ ...prev, version: prev.version + 1, etat: "retiree", empreinte: null, contenu: null });
        compte.retirees++;
      }
    } else if (avant && avant.depot && avant.depot !== corps.depot) {
      const note = `base de référence changée (${avant.depot} → ${corps.depot}) : aucun retrait déduit`;
      message = message ? message + " ; " + note : note;
    }

    const maintenant = new Date().toISOString();
    await noter(client, cfg.instance, { etag, depot: corps.depot, maison: typeof corps.maison === "string" ? corps.maison : null,
      lu_le: maintenant, statut: "recu", message, ...compte, derniere_reussite: maintenant });
    return { statut: "recu", message, ...compte };
  });
}

// ---- déclenchement périodique ------------------------------------------------
// Une lecture à la fois : la suivante part un intervalle après la fin de la
// précédente. Rien ne part sans adresse, jeton suffisant et intervalle.
export function demarrerLecteurBarre(cfg = barreConfig(), { log = console, fetchImpl } = {}) {
  if (!cfg.actif) { log.log(`[barre] lecteur désactivé : ${cfg.raison}`); return () => {}; }
  log.log(`[barre] lecteur actif : ${cfg.route} (instance ${cfg.instance}), toutes les ${Math.round(cfg.intervalMs / 1000)} s`);
  let arrete = false, minuterie = null;
  const tour = async () => {
    try {
      const r = await lireBarre(cfg, fetchImpl ? { fetchImpl } : {});
      if (r.statut === "recu") {
        log.log(`[barre] ${r.recues} reçue(s) : ${r.nouvelles} nouvelle(s), ${r.versions} nouvelle(s) version(s), `
          + `${r.retirees} retirée(s), ${r.refusees} refusée(s), ${r.ecartees} écartée(s) par La Barre${r.message ? " — " + r.message : ""}`);
      } else if (r.statut === "echec") log.warn(`[barre] lecture en échec : ${r.message}`);
    } catch (e) { log.error("[barre] lecture interrompue :", e && e.message); }
    if (!arrete) { minuterie = setTimeout(tour, cfg.intervalMs); minuterie.unref?.(); }
  };
  minuterie = setTimeout(tour, 0); minuterie.unref?.();
  return () => { arrete = true; clearTimeout(minuterie); };
}
