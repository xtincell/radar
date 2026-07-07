// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AUTORITÉ — SOURCE UNIQUE DE VÉRITÉ                                        ║
// ║  C'est ICI, et nulle part ailleurs, qu'on règle « qui peut se connecter »  ║
// ║  et « qui voit quoi ». Le roster (PEOPLE) est chargé depuis une config     ║
// ║  EXTERNE — jamais en dur dans le source.                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Trois NIVEAUX D'AUTORITÉ (du plus large au plus restreint) :
//   owner       → voit TOUT (toutes les tâches + les évaluations RH /rh, gated côté serveur).
//   supervisor  → voit TOUTES LES TÂCHES (toutes périodes, tous responsables) ; PAS le /rh.
//   member      → voit SES tâches du mois en cours uniquement.
//
// Source du roster (dans l'ordre de priorité) :
//   1. RADAR_AUTHZ_JSON = chemin d'un fichier JSON { "email": {"person":"...","role":"..."} }
//   2. RADAR_ADMIN_EMAIL = un seul email, promu "owner" (pas de roster externe)
//   3. rien de configuré → roster vide (aucun accès), posture restrictive par défaut.
"use strict";
import { readFileSync } from "node:fs";

function loadPeople() {
  const jsonPath = process.env.RADAR_AUTHZ_JSON;
  if (jsonPath) {
    try {
      const raw = JSON.parse(/^\s*[{[]/.test(jsonPath) ? jsonPath : readFileSync(jsonPath, "utf8"));
      const people = {};
      for (const [email, v] of Object.entries(raw || {})) {
        const e = String(email || "").trim().toLowerCase();
        if (!e) continue;
        people[e] = { person: (v && v.person) || "", role: (v && v.role) || "member" };
      }
      return people;
    } catch (e) {
      console.error("[authz] RADAR_AUTHZ_JSON illisible (" + jsonPath + "):", e && e.message);
      return {};
    }
  }

  const admin = (process.env.RADAR_ADMIN_EMAIL || "").trim().toLowerCase();
  if (admin) return { [admin]: { person: "", role: "owner" } };

  return {};
}

export const PEOPLE = loadPeople();

// Allowlist du mur = exactement les clés de PEOPLE (+ éventuels extras via DASH_ALLOWLIST,
// gérés dans _middleware.js). Un seul endroit à maintenir.
export const ALLOW = Object.keys(PEOPLE);

// Identité d'un email : { email, person, role }. Email inconnu → member sans nom
// (ne verra rien, faute de tâches à son nom) : posture restrictive par défaut.
export function identityFor(email) {
  const e = (email || "").trim().toLowerCase();
  const p = PEOPLE[e];
  return p ? { email: e, person: p.person, role: p.role }
           : { email: e, person: "", role: "member" };
}
