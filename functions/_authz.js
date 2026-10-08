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
        people[e] = { person: String((v && v.person) || '').trim(), role: (v && v.role) || "member" };
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

// Même contrat que l'UI : co-responsable exact, échéance du mois local serveur,
// ou travail non daté encore ouvert. TZ est la timezone de l'instance.
const DONE = ['Envoyé dans Slack','Livré','Livré (cycle)','Validé','Bouclé','Archivé'];
const FROZEN = ['Frozen','Gelé'];
export function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
export function taskAuthority(context) {
  return { ...identityFor(context.data?.email || ''), fullAccess: context.data?.fullAccess === true };
}
export function canAccessBrief(brief, context) {
  const who = taskAuthority(context);
  if (who.fullAccess) return true;
  const privateTo = String(brief.private_to || '').trim();
  if (privateTo && privateTo !== who.person) return false;
  if (who.role === 'owner' || who.role === 'supervisor') return true;
  if (!who.person) return false;
  const owners = String(brief.responsable || '').trim().split(/\s*[/&;]\s*|\s+et\s+/).map(x=>x.trim());
  if (!owners.includes(who.person)) return false;
  const deadline = String(brief.deadline || '');
  return /^\d{4}-\d{2}/.test(deadline) ? deadline.slice(0,7) === monthKey()
    : !DONE.includes(brief.statut) && !FROZEN.includes(brief.statut) && String(brief.closed_at || '').length < 4;
}
export function assertBriefAccess(brief, context) {
  if (!canAccessBrief(brief, context)) throw Object.assign(new Error('dossier hors de votre périmètre'), {status:403});
}
// SQL paramétré et contrôle des lignes verrouillées partagent cette autorité.
// `fields` ne provient jamais d'une requête : alias ou expressions internes.
export function briefScopeSql(context, params, fields='') {
  if (context.data?.fullAccess === true) return 'true';
  const who = taskAuthority(context);
  const col = key => typeof fields === 'string' ? fields + key : fields[key];
  const bind = value => { params.push(value); return '$'+params.length; };
  if (who.role !== 'owner' && who.role !== 'supervisor' && !who.person) return 'false';
  const person = bind(who.person || '');
  const privateScope = `(btrim(coalesce(${col('private_to')},'')) = '' or btrim(${col('private_to')}) = ${person})`;
  if (who.role === 'owner' || who.role === 'supervisor') return privateScope;
  const month = bind(monthKey());
  const done = bind([...DONE,...FROZEN]);
  return `(${privateScope} and ${person} = any(regexp_split_to_array(btrim(coalesce(${col('responsable')},'')), '\\s*[/&;]\\s*|\\s+et\\s+'))
    and case when coalesce(${col('deadline')},'') ~ '^\\d{4}-\\d{2}' then left(${col('deadline')},7) = ${month}
    else coalesce(${col('statut')},'') <> all(${done}::text[]) and length(coalesce(${col('closed_at')}::text,'')) < 4 end)`;
}
