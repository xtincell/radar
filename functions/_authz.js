// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AUTORITÉ — SOURCE UNIQUE DE VÉRITÉ (Matanga RADAR)                        ║
// ║  C'est ICI, et nulle part ailleurs, qu'on règle « qui peut se connecter »  ║
// ║  et « qui voit quoi ». Édite la table PEOPLE ci-dessous, c'est tout.       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Trois NIVEAUX D'AUTORITÉ (du plus large au plus restreint) :
//   owner       → voit TOUT (toutes les tâches + les évaluations RH /rh, gated côté serveur).
//   supervisor  → voit TOUTES LES TÂCHES (toutes périodes, tous responsables) ; PAS le /rh.
//   member      → voit SES tâches du mois en cours uniquement.
//
// Pour changer le niveau de quelqu'un : édite sa ligne (role: "owner|supervisor|member").
// Pour donner accès à un nouvel email : ajoute une ligne. Pour le retirer : supprime-la.
// `person` doit être EXACTEMENT le nom tel qu'il apparaît dans la colonne `responsable`
// (sert au filtrage « ses tâches » pour les members ; ignoré pour owner/supervisor).
"use strict";

export const PEOPLE = {
  // ── OWNER (accès total) ───────────────────────────────────────────────────
  "xtincell@gmail.com":                  { person: "Alexandre",             role: "owner" },
  // Alexandre Djengue : traité comme toi (accès total). Si c'est une personne
  // DISTINCTE à restreindre, passe simplement role à "member" (ou supprime la ligne).
  "alexandre.djengue@matangaagency.com": { person: "Alexandre",             role: "owner" },

  // ── SUPERVISORS (voient TOUTES les tâches, toutes périodes) ───────────────
  "vanelle.omong@matangaagency.com":     { person: "Vanelle",              role: "supervisor" },
  "derick.tchaou@matangaagency.com":     { person: "Derick",               role: "supervisor" },
  // Adeline — upgradée au niveau superviseur (voit toutes les tâches). 3 comptes Slack = même personne.
  "adeline.kedi@matangaagency.com":      { person: "Adeline",              role: "supervisor" },
  "patrick.mvogo@matangaagency.com":     { person: "Adeline",              role: "supervisor" }, // compte Slack « ADELINE KEDI »
  "kediadelinepro@gmail.com":            { person: "Adeline",              role: "supervisor" }, // 3e compte « KEDI ADELINE »
  // Nelson Metougue — accès direction pour le suivi du département en continu (rapport semestriel S1 2026).
  "nelson.metougue@matangaagency.com":   { person: "Nelson",               role: "supervisor" },

  // ── MEMBERS (voient seulement leurs tâches du mois en cours) ───────────────
  "william.mandengue@matangaagency.com": { person: "William K. Mandengue", role: "member" },
  "loic.nang@matangaagency.com":         { person: "Loïc Papin",           role: "member" },
  "stephane.ondoua@matangaagency.com":   { person: "Stephane Ondoua",      role: "member" },
  "lydienne.epesse@matangaagency.com":   { person: "Lydienne",             role: "member" },
  "luther.ndongo@matangaagency.com":     { person: "Luther",               role: "member" },
  "ralph.bikes@matangaagency.com":       { person: "Ralph",                role: "member" },
  "fadimatou.hamandjida@matangaagency.com": { person: "Fadimatou",         role: "member" },
  "sergefdn@gmail.com":                  { person: "Serge",                role: "member" }, // Serge Ngueli (gmail Slack)
  "nelsonmet2006@gmail.com":             { person: "Nelson",               role: "member" }, // Nelson Metougue (gmail Slack)
};

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
