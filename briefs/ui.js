"use strict";
/* ============================================================
   Radar — helpers partagés (ui.js)
   Garantit la cohérence entre toutes les pages :
   - statuts / entrées canoniques (tirés de la base réelle)
   - équipe dynamique (jamais de liste figée qui oublie un responsable)
   - feedback : toast + bandeau d'état de la source de données
   - clôture / réouverture d'une tâche en base
   Chargé APRÈS supa.js et AVANT le script de page.
   ============================================================ */
(function(){  // IIFE : on n'expose QUE via window.* — aucune fuite dans le scope global partagé entre scripts

/* ---- modèle canonique (source : public.briefs) ---- */
window.STATUTS         = ["Reçu","En cours","En attente client","Bloqué","Envoyé dans Slack","Livré","Validé","Bouclé","Frozen","Archivé"];
window.STATUTS_TERMINAUX = ["Envoyé dans Slack","Livré","Validé","Bouclé","Archivé"];
window.STATUT_CLOTURE  = "Bouclé";   // statut dominant pour « traité » (184 lignes)
window.STATUT_SLACK    = "Envoyé dans Slack";   // livraison faite via Slack (état de livraison terminal)
/* « Frozen » = tâche gelée : ni active (hors to-do/pipe), ni faite (hors bilan « fait »).
   Usage : dossier sans nouvelle ni preuve d'avancement → on le sort du bruit sans mentir
   sur son achèvement. Consultable sur gel.html. */
window.STATUT_GEL      = "Frozen";
window.STATUTS_GELES   = ["Frozen","Gelé"];   // tolère l'ancien libellé FR éventuel
window.isFrozen        = m => window.STATUTS_GELES.includes((m && m.statut) || "");
/* Niveaux d'entrée : Projet (Maître) → Tâche → Révision. « Doublon » = marqueur de dédoublonnage. */
window.ENTREES         = ["Maître","Tâche","Révision","Doublon"];
/* Vrai si l'entrée est un enfant porteur de travail (tâche ou révision), pas un projet ni un doublon. */
window.isTaskLevel     = e => e==="Tâche" || e==="Révision";

/* ---- SOURCE UNIQUE : mapping client→couleur, types (défauts, surchargés par app_config) ----
   Fini les `const CLIENT_VAR={…}` recopiés sur chaque page. Les pages appellent
   window.clientVar(client). loadConfig() (supa.js) remplace ces valeurs par la base. */
window.CLIENT_VAR = {};
window.clientVar = name => `var(${(window.CLIENT_VAR && window.CLIENT_VAR[name]) || "--c-other"})`;
window.TYPES = ["Création KV","Packaging","DA Campaign","Production vidéo","Stratégie","Modification","Pitch","Autre"];
window.STATUT_COL = {"En cours":"var(--st-cours)","En attente client":"var(--st-attente)","Reçu":"var(--st-recu)",
  "Bloqué":"var(--st-bloque)","Envoyé dans Slack":"var(--st-slack)","Livré":"var(--st-livre)","Livré (cycle)":"var(--st-livre)",
  "Validé":"var(--st-livre)","Bouclé":"var(--st-boucle)","Frozen":"var(--st-frozen)","Archivé":"var(--st-archive)","":"var(--st-recu)"};
window.statutColor = s => (window.STATUT_COL && window.STATUT_COL[s]) || "var(--st-recu)";

/* Équipe de base — fusionnée à chaud avec les responsables réellement présents
   en base pour ne JAMAIS proposer une liste qui oublie quelqu'un. */
window.TEAM_BASE = [];
/* exposé hors IIFE plus bas aussi (window.TEAM_BASE) pour le chrome partagé */

function teamFrom(briefs){
  const s = new Set(TEAM_BASE);
  (briefs||[]).forEach(b=>{
    const r = (b && (b.responsable || (b.m && b.m.responsable)) || "").trim();
    // on ignore les valeurs composées / parasites ("X & Y", "à programmer"…)
    if(r && !/[\/&;]| et |réunion|stand ?by|à programmer/i.test(r)) s.add(r);
  });
  return [...s].sort((a,b)=>a.localeCompare(b,"fr"));
}
window.teamFrom = teamFrom;

/* options <select> prêtes à l'emploi */
window.respOptions = (current, briefs)=>{
  const team = teamFrom(briefs);
  if(current && !team.includes(current)) team.unshift(current); // garde une valeur exotique existante
  return `<option value="">— responsable —</option>` +
    team.map(n=>`<option value="${escAttr(n)}"${n===current?" selected":""}>${escHtml(n)}</option>`).join("");
};
window.statutOptions = current =>
  STATUTS.map(s=>`<option value="${escAttr(s)}"${s===current?" selected":""}>${escHtml(s)}</option>`).join("");
window.entreeOptions = current =>
  ENTREES.map(s=>`<option value="${escAttr(s)}"${s===current?" selected":""}>${escHtml(s)}</option>`).join("");

/* ---- date locale (Douala UTC+1) — jamais toISOString() (bug UTC) ---- */
function todayISO(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
window.todayISO = todayISO;

/* ---- identité « qui suis-je » (suivi perso par responsable) ----
   Une seule clé, NON versionnée : l'identité n'est pas du cache, on ne
   reconnecte pas les gens à chaque déploiement. Partagée par todo.html
   (vue perso) et equipe.html (tableau d'équipe). */
const ME_KEY = "radar:me";
window.getMe = ()=>{ try{ return localStorage.getItem(ME_KEY) || ""; }catch(e){ return ""; } };
window.setMe = v =>{ try{ v ? localStorage.setItem(ME_KEY, v) : localStorage.removeItem(ME_KEY); }catch(e){} };

/* Découpe un champ « responsable » composé (« X/Y », « X & Y », « X et Y ») en
   personnes. Source unique de vérité du découpage, réutilisée partout
   (todo, equipe, radar appliquent la même règle). */
function splitOwners(resp){
  const r = (resp||"").trim();
  if(!r) return [];
  return r.split(/\s*[\/&;]\s*|\s+et\s+/).map(x=>x.trim()).filter(Boolean);
}
window.splitOwners = splitOwners;
/* Vrai si la personne `who` est responsable (seule ou co-responsable) de `resp`. */
window.ownsTask = (resp, who)=>{
  if(!who) return false;
  const w = who.trim();
  return splitOwners(resp).includes(w);
};
/* Vrai si la tâche est partagée entre plusieurs responsables. */
window.isShared = resp => splitOwners(resp).length > 1;

/* « Qui suis-je, pour signer un commentaire ? » — l'auteur d'un commentaire/observation.
   Priorité : compte authentifié (MTG_IDENTITY.person, non falsifiable côté serveur) pour
   un non-owner ; sinon l'identité « voir comme » choisie (getMe, hors « * » manager) ;
   sinon la personne du compte (owner). Vide → on demande de choisir son nom. */
window.currentActor = function(){
  const id = window.MTG_IDENTITY;
  if(id && id.role && id.role!=="owner" && id.person) return id.person;
  const me = (window.getMe && window.getMe()) || "";
  if(me && me!=="*") return me;
  return (id && id.person) || "";
};

/* ---- dépendances de tâches (« qui bloque quoi ») ----
   depends_on = liste de codes (ndeg) dont la tâche dépend (ex. « FRC-049, FRC-050 »).
   Source unique de vérité du calcul de blocage, réutilisée par toutes les pages. */
const DONE_SET = new Set(["Envoyé dans Slack","Livré","Livré (cycle)","Validé","Bouclé","Archivé"]);
window.isDoneBrief = m => !!m && (DONE_SET.has(m.statut) || (m.closedAt && String(m.closedAt).length>=4));
window.parseDeps = s => (s||"").split(/[,;\s]+/).map(x=>x.trim()).filter(Boolean);
/* Bloqueurs ENCORE OUVERTS d'une tâche (les dépendances pas encore terminées). byNdeg : code → brief. */
window.depBlockers = (m, byNdeg) => parseDeps(m&&m.dependsOn).map(c=>byNdeg&&byNdeg[c]).filter(Boolean).filter(b=>!isDoneBrief(b));
/* Vrai si la tâche est bloquée par au moins une dépendance non terminée. */
window.isDepBlocked = (m, byNdeg) => depBlockers(m, byNdeg).length > 0;
/* Tâches ENCORE OUVERTES que `m` bloque (celles qui dépendent de m et pas encore finies). */
window.depBlocking = (m, all) => (all||[]).filter(x=> x!==m && parseDeps(x.dependsOn).includes(m&&m.ndeg) && !isDoneBrief(x));

/* ---- délais réalistes (étalon agence) ----
   Hard-deadline = date exigée par le client ou la coordination (deadlineHard=true) : engagement ferme.
   Délai réaliste = étalon dérivé du délai moyen de livraison de l'agence PAR TYPE
   (closed_at − date_reception sur les livrés), + 5 JOURS OUVRÉS (règle tacite).
   Sert de référence pour repérer les deadlines intenables (hard < réaliste). */
const _dStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function addWorkingDays(iso, n){
  if(!/^\d{4}-\d{2}-\d{2}/.test(iso||"")) return "";
  const d=new Date(String(iso).slice(0,10)+"T00:00:00"); let added=0;
  while(added<Math.max(0,Math.round(n))){ d.setDate(d.getDate()+1); const wd=d.getDay(); if(wd!==0&&wd!==6) added++; }
  return _dStr(d);
}
window.addWorkingDays = addWorkingDays;
/* Construit l'étalon : { byType:{type:jours}, overall:jours } depuis les livrés. */
window.leadBenchmark = (briefs)=>{
  const CANONICAL_BENCHMARKS = {
    "Packaging": 15,
    "Création KV": 10,
    "DA Campaign": 20,
    "Production vidéo": 21,
    "Stratégie": 14,
    "Pitch": 15,
    "Modification": 4,
    "Autre": 7,
    "Coordination": 10
  };

  const byType={}, all=[];
  (briefs||[]).forEach(b=>{
    const dl=String(b&&b.closedAt||"").slice(0,10), rc=String(b&&b.date||"").slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dl)||!/^\d{4}-\d{2}-\d{2}$/.test(rc)) return;
    const lead=Math.round((new Date(dl+"T00:00:00")-new Date(rc+"T00:00:00"))/864e5);
    
    // Écarter les tâches rétroactives/backfills (lead <= 1 jour)
    // Écarter aussi les urgences (P0 ou deadline exigée) pour avoir un délai moyen standard
    if(lead <= 1 || lead > 180) return;
    if(b.prio === "P0" || b.deadlineHard) return;

    const t=b.type||"Autre"; (byType[t]=byType[t]||[]).push(lead); all.push(lead);
  });
  
  // Utiliser la moyenne historique si on a au moins 3 échantillons, sinon utiliser le délai canonique
  const avg=(a, fallback)=>a.length >= 3 ? Math.round(a.reduce((x,y)=>x+y,0)/a.length) : fallback;
  const out={byType:{},overall:avg(all, 10)};
  
  const allTypes = new Set([...Object.keys(CANONICAL_BENCHMARKS), ...Object.keys(byType)]);
  allTypes.forEach(t=>{
    const fallback = CANONICAL_BENCHMARKS[t] || 7;
    out.byType[t] = avg(byType[t]||[], fallback);
  });
  return out;
};
/* Délai réaliste (ISO) pour une tâche : réception + délai-type (calendaire) + 5 jours ouvrés. */
window.realisticDeadlineISO = (brief, bench)=>{
  const rc=String(brief&&brief.date||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(rc)) return "";
  const lead = (bench&&bench.byType&&bench.byType[brief.type]!=null)?bench.byType[brief.type]
             : (bench&&bench.overall!=null)?bench.overall : 7;
  const base=new Date(rc+"T00:00:00"); base.setDate(base.getDate()+Math.max(0,Math.round(lead)));
  return addWorkingDays(_dStr(base),5);
};
/* Tension de la deadline vs l'étalon agence (pression sur l'équipe) — 3 niveaux :
   'fair'   = deadline ≥ délai réaliste (durée moyenne + 5 j ouvrés) → confort
   'tight'  = entre la durée moyenne et le délai réaliste → acceptable mais serré
   'unfair' = deadline < durée moyenne du type → délai INJUSTE (trop court)
   'none'   = pas de deadline datée.
   → permet de voir qu'un retard 'acceptable' venait en fait d'un délai injuste. */
window.deadlineTension = (m, bench)=>{
  const rc=String(m&&m.date||"").slice(0,10), dl=String(m&&m.deadline||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(rc)||!/^\d{4}-\d{2}-\d{2}$/.test(dl)) return "none";
  const lead=(bench&&bench.byType&&bench.byType[m.type]!=null)?bench.byType[m.type]:(bench&&bench.overall!=null)?bench.overall:7;
  const avg=new Date(rc+"T00:00:00"); avg.setDate(avg.getDate()+Math.max(0,Math.round(lead)));
  const avgISO=_dStr(avg), realISO=realisticDeadlineISO(m,bench);
  if(realISO && dl>=realISO) return "fair";
  if(dl>=avgISO) return "tight";
  return "unfair";
};
/* Sévérité d'un retard de LIVRAISON (pour les livrés) vs l'étalon :
   'ahead' = livré avant la durée moyenne · 'acceptable' = dans la moyenne→délai agence
   'serious' = au-delà du délai agence (le plus grave). */
window.deliverySeverity = (m, bench)=>{
  const rc=String(m&&m.date||"").slice(0,10), cl=String(m&&m.closedAt||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(rc)||!/^\d{4}-\d{2}-\d{2}$/.test(cl)) return "";
  const lead=(bench&&bench.byType&&bench.byType[m.type]!=null)?bench.byType[m.type]:(bench&&bench.overall!=null)?bench.overall:7;
  const actual=Math.round((new Date(cl+"T00:00:00")-new Date(rc+"T00:00:00"))/864e5);
  const real=realisticDeadlineISO(m,bench);
  const realDays=real?Math.round((new Date(real+"T00:00:00")-new Date(rc+"T00:00:00"))/864e5):lead+7;
  if(actual<=lead) return "ahead";
  if(actual<=realDays) return "acceptable";
  return "serious";
};

const escHtml = s => (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const escAttr = s => (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---- styles injectés une fois (toast + bandeau) ---- */
(function injectStyles(){
  if(document.getElementById("radar-ui-styles")) return;
  const css = `
  .mtg-toasts{position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
  .mtg-toast{pointer-events:auto;font:600 14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;
    color:#fff;background:#1d2b3a;padding:11px 14px;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.28);
    max-width:340px;opacity:0;transform:translateY(-6px);transition:opacity .18s,transform .18s}
  .mtg-toast.in{opacity:1;transform:none}
  .mtg-toast.ok{background:#15803d}
  .mtg-toast.err{background:#b91c1c}
  .mtg-toast.warn{background:#b45309}
  .mtg-banner{position:sticky;top:0;z-index:9000;font:600 13.5px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;
    padding:10px 16px;display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;text-align:center}
  .mtg-banner.warn{background:#fde68a;color:#713f12;border-bottom:1px solid #f59e0b}
  .mtg-banner.err{background:#fecaca;color:#7f1d1d;border-bottom:1px solid #ef4444}
  .mtg-banner button{font:inherit;cursor:pointer;border:1px solid currentColor;background:transparent;
    color:inherit;border-radius:7px;padding:3px 10px}

  /* Modal Overlay (Glassmorphism & Frosted Glass) */
  .mtg-modal-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); opacity: 0; pointer-events: none; transition: opacity 0.22s ease-out; font-family: var(--font-text, system-ui, sans-serif); }
  .mtg-modal-overlay.show { opacity: 1; pointer-events: auto; }
  .mtg-modal-overlay p { margin: 0; }
  .mtg-modal-overlay blockquote { margin: 0; }

  /* Modal Card */
  .mtg-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; max-width: 760px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4); transform: scale(0.94); transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .mtg-modal-overlay.show .mtg-modal { transform: scale(1); }

  /* Modal Header */
  .mtg-modal-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--paper-50); }
  .mtg-modal-title { font-family: var(--font-display, inherit); font-weight: 600; font-size: 18px; color: var(--fg1); display: flex; align-items: center; gap: 8px; margin: 0; }
  .mtg-modal-close { border: 0; background: transparent; color: var(--fg3); cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
  .mtg-modal-close:hover { background: var(--paper-200); color: var(--fg1); }

  /* Modal Body */
  .mtg-modal-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }

  /* Custom visual card layouts for concept variables */
  .mtg-ideabox { background: linear-gradient(135deg, color-mix(in srgb, var(--orange-500) 8%, var(--surface)) 0%, color-mix(in srgb, var(--orange-500) 2%, var(--surface)) 100%); border-left: 4px solid var(--orange-500); border-radius: 12px; padding: 18px; position: relative; text-align: left; }
  .mtg-ideabox-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--orange-700); margin-bottom: 6px; }
  .mtg-ideabox-content { font-family: var(--font-display, inherit); font-style: italic; font-weight: 500; font-size: 17px; line-height: 1.45; color: var(--fg1); }
  
  .mtg-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 640px) { .mtg-grid-2col { grid-template-columns: 1fr; } }
  
  .mtg-info-card { background: var(--paper-50); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; text-align: left; }
  .mtg-info-card-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg3); margin-bottom: 6px; }
  .mtg-info-card-text { font-size: 13.5px; line-height: 1.45; color: var(--fg1); white-space: pre-line; }

  .mtg-axecard { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; text-align: left; }
  .mtg-axecard-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .mtg-axecard-badge { font-size: 10px; font-weight: 700; background: var(--paper-200); color: var(--fg2); padding: 3px 9px; border-radius: 999px; }
  .mtg-axecard-title { font-family: var(--font-display, inherit); font-weight: 600; font-size: 15px; color: var(--fg1); }
  
  .mtg-axecard-item { margin-top: 10px; border-top: 1px solid var(--border-soft); padding-top: 8px; }
  .mtg-axecard-item:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
  .mtg-axecard-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg3); font-weight: 700; margin-bottom: 2px; }
  .mtg-axecard-val { font-size: 13px; line-height: 1.4; color: var(--fg1); }
  .mtg-axecard-copy { font-size: 13.5px; font-weight: 600; color: var(--orange-600); line-height: 1.35; }

  /* Modal Footer */
  .mtg-modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; background: var(--paper-50); }
  `;
  const st=document.createElement("style"); st.id="radar-ui-styles"; st.textContent=css;
  document.head.appendChild(st);
})();

/* ---- toast non-bloquant ---- */
function flash(msg, type){
  let wrap=document.querySelector(".mtg-toasts");
  if(!wrap){ wrap=document.createElement("div"); wrap.className="mtg-toasts"; document.body.appendChild(wrap); }
  const t=document.createElement("div");
  t.className="mtg-toast "+(type==="err"?"err":type==="warn"?"warn":type==="ok"?"ok":"");
  t.textContent=msg; wrap.appendChild(t);
  requestAnimationFrame(()=>t.classList.add("in"));
  setTimeout(()=>{ t.classList.remove("in"); setTimeout(()=>t.remove(),220); }, type==="err"?5000:2600);
}
window.flash = flash;

/* ---- état de la source de données ---- */
window.isLive = ()=> window.SUPA_SOURCE==="supabase";

/* Bandeau visible quand on n'est PAS sur la base live. À appeler après loadBriefsLive(). */
function sourceBanner(){
  document.querySelectorAll(".mtg-banner").forEach(b=>b.remove());
  const src=window.SUPA_SOURCE;
  if(src==="supabase" || !src) return;            // live → rien
  const b=document.createElement("div");
  if(src==="csv"){
    b.className="mtg-banner warn";
    b.innerHTML=`⚠️ Mode hors-ligne — données figées du dernier export CSV. La base live est injoignable : tes modifications ne seront PAS enregistrées. <button type="button">Réessayer</button>`;
  } else {
    b.className="mtg-banner err";
    const why = window.SUPA_ERROR ? ` (${escHtml(String(window.SUPA_ERROR)).slice(0,80)})` : "";
    b.innerHTML=`⛔ Impossible de charger les données${why} — la base Supabase est peut-être en pause. <button type="button">Réessayer</button>`;
  }
  b.querySelector("button").addEventListener("click", ()=>location.reload());
  document.body.insertBefore(b, document.body.firstChild);
}
window.sourceBanner = sourceBanner;

/* ---- mutations métier (avec feedback) ---- */
async function closeTask(id, label){
  await updateBrief(id, {statut:STATUT_CLOTURE, closed_at:todayISO()});
  flash(`✓ ${label?label+" — ":""}clôturé`, "ok");
}
async function reopenTask(id, label){
  await updateBrief(id, {statut:"En cours", closed_at:null});
  flash(`↻ ${label?label+" — ":""}rouvert`, "ok");
}
async function setStatut(id, statut, label){
  const patch={statut};
  if(STATUTS_TERMINAUX.includes(statut)) patch.closed_at=todayISO();
  else patch.closed_at=null;
  await updateBrief(id, patch);
  flash(`✓ ${label?label+" : ":""}${statut}`, "ok");
}
window.closeTask = closeTask;
window.reopenTask = reopenTask;
window.setStatut = setStatut;

/* ============================================================
   Modale « brief léger » — lecture rapide sans la fiche massive.
   Affiche JUSTE les briefs du projet (Client / DA-Créa / Production),
   du projet de la tâche OU de sa tâche ascendante (parent). De là on
   ouvre la fiche complète. window.openBriefModal(brief).
   ============================================================ */
(function injectBriefCSS(){
  if(document.getElementById("mtg-brief-css")) return;
  const css=`
  .bm-bd{position:fixed;inset:0;z-index:99997;background:rgba(20,14,8,.5);display:none;align-items:center;justify-content:center;padding:18px}
  .bm-bd.show{display:flex}
  .bm{background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:0 24px 70px rgba(30,20,10,.4);
    max-width:620px;width:100%;max-height:88vh;display:flex;flex-direction:column;overflow:hidden}
  .bm-h{padding:18px 22px 14px;border-bottom:1px solid var(--border)}
  .bm-h .c{font-family:var(--font-mono);font-size:10.5px;color:var(--fg3);font-weight:500}
  .bm-h h2{font-family:var(--font-display);font-weight:600;font-size:20px;line-height:1.18;margin:5px 0 3px}
  .bm-h .s{font-size:12.5px;color:var(--fg3)}
  .bm-tabs{display:flex;gap:5px;padding:11px 22px 0}
  .bm-tab{font:inherit;font-size:12.5px;font-weight:600;color:var(--fg2);background:var(--paper-100);border:0;border-radius:999px;padding:7px 13px;cursor:pointer}
  .bm-tab.on{background:var(--ink-950);color:#F7F2EA}
  .bm-body{padding:14px 22px 8px;overflow:auto;flex:1;min-height:120px}
  .bm-meta{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 4px}
  .bm-sec{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg3);margin:17px 0 9px;padding-top:12px;border-top:1px solid var(--border)}
  .bm-sec:first-child{margin-top:2px;padding-top:0;border-top:0}
  .bm-kv{display:grid;grid-template-columns:118px 1fr;gap:8px 14px;align-items:baseline}
  .bm-k{font-size:12px;font-weight:600;color:var(--fg3);line-height:1.5}
  .bm-v{font-size:13.5px;line-height:1.5;color:var(--fg1)}
  .bm-claim{font-family:var(--font-display);font-weight:600;font-size:16.5px;line-height:1.3;color:var(--fg1);background:var(--paper-100);border-left:3px solid var(--orange-400);border-radius:0 10px 10px 0;padding:11px 14px;margin:0 0 6px}
  .bm-flag{font-size:11px;font-weight:700;color:var(--orange-700)}
  .bm-chip{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;line-height:1;border-radius:999px;padding:5px 11px;background:var(--paper-100);color:var(--fg2);border:1px solid var(--border)}
  .bm-chip.ok{color:var(--success);background:var(--success-bg);border-color:color-mix(in srgb,var(--success) 26%,transparent)}
  .bm-chip.info{color:var(--info);background:var(--info-bg);border-color:color-mix(in srgb,var(--info) 26%,transparent)}
  .bm-chip.warn{color:var(--orange-700);background:var(--warning-bg);border-color:color-mix(in srgb,var(--warning) 30%,transparent)}
  .bm-chip.bad{color:var(--danger);background:var(--danger-bg);border-color:color-mix(in srgb,var(--danger) 26%,transparent)}
  .bm-chip.mut{color:var(--fg3);background:var(--paper-100);border-color:var(--border)}
  .bm-deps{display:flex;flex-wrap:wrap;gap:6px}
  .bm-dep{display:inline-flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:11.5px;font-weight:600;text-decoration:none;color:var(--fg2);background:var(--paper-100);border:1px solid var(--border);border-radius:999px;padding:4px 10px}
  .bm-dep:hover{border-color:var(--orange-400);color:var(--orange-700)}
  .bm-note{font-size:12px;line-height:1.5;color:var(--fg2);margin:13px 0 2px;padding:10px 13px;background:var(--paper-100);border-radius:10px}
  .bm-note a{color:var(--orange-600);font-weight:700;text-decoration:none}
  .bm-empty{color:var(--fg3);font-style:italic;font-size:13.5px;padding:24px 2px;text-align:center}
  .bm-f{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 22px;border-top:1px solid var(--border)}
  .bm-x{border:0;background:transparent;color:var(--fg3);font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .bm-open{display:inline-flex;align-items:center;gap:7px;text-decoration:none;background:var(--orange-500);color:#fff;font-weight:700;font-size:13.5px;padding:9px 16px;border-radius:999px}
  .bm-open:hover{background:var(--orange-600)}
  @media(max-width:560px){ .bm{max-height:92vh} .bm-h h2{font-size:18px} }`;
  const st=document.createElement("style"); st.id="mtg-brief-css"; st.textContent=css; document.head.appendChild(st);
})();
/* ============================================================
   Calculateur des scores de complétion des briefs
   Prend en compte l'héritage du projet parent pour les champs vides.
   ============================================================ */
window.calcBriefScores = function(m, parent){
  const has = v => v != null && String(v).trim() !== "";
  
  // 1. Brief Client
  const bcKeys = [
    "contexte_business", "contexte_marque", "contexte_market", "contexte_com",
    "probleme_marketing", "obj_business", "obj_marketing", "obj_communication",
    "cible_principale", "cible_secondaire", "cible_socio_eco", "cible_situation",
    "cible_frein", "cible_motivation", "cible_langage", "insight_client", "big_idea",
    "axe1_nom", "axe1_intention", "axe1_promesse", "axe1_ton", "axe1_copy_p", "axe1_copy_s", "axe1_preuve",
    "axe2_nom", "axe2_intention", "axe2_promesse", "axe2_ton", "axe2_copy_p", "axe2_copy_s", "axe2_preuve",
    "contrainte_marque", "contrainte_legale", "contrainte_culturelle", "contrainte_produit", "contrainte_format", "contrainte_delai"
  ];
  let bcFilled = 0;
  const bc = m.briefClient || {};
  const bcP = parent ? (parent.briefClient || {}) : {};
  bcKeys.forEach(k => { if(has(bc[k]) || has(bcP[k])) bcFilled++; });
  const scoreClient = Math.round((bcFilled / bcKeys.length) * 100);

  // 2. DA / Créa
  const dcKeys = [
    "message_claim", "challenge_creatif", "principe_creatif",
    "concept1_nom", "concept1_axe", "concept1_piste", "concept1_croisement", "concept1_univers", "concept1_safe", "concept1_reco", "concept1_money",
    "concept2_nom", "concept2_axe", "concept2_piste", "concept2_croisement", "concept2_univers", "concept2_safe", "concept2_reco", "concept2_money",
    "da_style_image", "da_lumiere", "da_cadrage", "da_decor", "da_styling", "da_attitude", "da_palette", "da_typo", "da_retouche",
    "copy_claim", "copy_accroche", "copy_explication", "copy_cta", "reco_agence"
  ];
  let dcFilled = 0;
  const dc = m.briefCreatif || {};
  const dcP = parent ? (parent.briefCreatif || {}) : {};
  dcKeys.forEach(k => { if(has(dc[k]) || has(dcP[k])) dcFilled++; });
  const scoreCrea = Math.round((dcFilled / dcKeys.length) * 100);

  // 3. Production
  const prodKeys = [
    "livrable_principal", "nb_slides", "ratio", "plateformes", "deadline_prod", "responsable_prod",
    "spec_social_portrait", "spec_carre", "spec_story", "spec_export", "spec_safety_zone", "spec_file_weight", "spec_naming"
  ];
  let prodFilled = 0;
  const bp = m.briefProduction || {};
  const bpP = parent ? (parent.briefProduction || {}) : {};
  prodKeys.forEach(k => { if(has(bp[k]) || has(bpP[k])) prodFilled++; });
  
  const checkArr = (k) => {
    const arr = bp[k] || bpP[k];
    return Array.isArray(arr) && arr.length > 0;
  };
  if(checkArr("livrables_liste")) prodFilled++;
  if(checkArr("gabarit_slides")) prodFilled++;
  if(checkArr("assets_necessaires")) prodFilled++;
  if(checkArr("checklist_controle")) prodFilled++;
  const scoreProd = Math.round((prodFilled / (prodKeys.length + 4)) * 100);

  // 4. Case Study
  const csKeys = [
    "challenge", "insight", "strategie", "big_idea", "concept_retenu", "execution", "da",
    "kpi_portee", "kpi_impressions", "kpi_engagement", "kpi_taux_eng", "kpi_clics", "kpi_leads", "kpi_sentiment", "kpi_verbatims", "kpi_reutilisabilite",
    "learning_ok", "learning_improve", "learning_platform", "learning_industrial", "learning_sell"
  ];
  let csFilled = 0;
  const cs = m.caseStudy || {};
  const csP = parent ? (parent.caseStudy || {}) : {};
  csKeys.forEach(k => { if(has(cs[k]) || has(csP[k])) csFilled++; });
  const scoreCase = Math.round((csFilled / csKeys.length) * 100);

  return { client: scoreClient, crea: scoreCrea, prod: scoreProd, caseStudy: scoreCase };
};

/* Les 4 vues (Brief client / DA-Créa / Production / Case Study) sont RECONSTRUITES à partir des
   données de la tâche (Supabase) — plus aucun fichier .md « en dur » à charger. */
window.openBriefModal = function(m){
  if(!m) return;
  let bd=document.getElementById("mtg-brief-bd");
  if(!bd){ bd=document.createElement("div"); bd.id="mtg-brief-bd"; bd.className="bm-bd"; document.body.appendChild(bd);
    bd.addEventListener("click",e=>{ if(e.target===bd) bd.classList.remove("show"); });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape") bd.classList.remove("show"); }); }
  const E=escHtml, has=v=>v!=null&&String(v).trim()!=="";
  const J=arr=>[...new Set(arr.filter(Boolean).map(s=>String(s).trim()))].join(" · ");   // dédoublonne (marque===client)
  const resp=s=>(s||"").trim();
  const ctx=(m.comm||"").replace(/\[[^\]]*\]/g,"").replace(/·\s*date ≈[^|·]*/g,"").replace(/\s*\|\s*/g," · ").replace(/\s+/g," ").trim();
  const tone=s=>{const x=(s||"").toLowerCase();
    if(/livr|validé|valide|terminé|termine|fait|clôtur|cloture|envoyé|envoye/.test(x))return"ok";
    if(/cours|production/.test(x))return"info";
    if(/bloqué|bloque|urgent|retard/.test(x))return"bad";
    if(/attente|gel|frozen|pause|stand/.test(x))return"warn";
    return"mut";};
  const docTone=s=>{const x=(s||"").toLowerCase(); if(/valid|complet|présent|presente|finalis/.test(x))return"ok"; if(/brouillon|cours/.test(x))return"warn"; return"mut";};
  const chip=(txt,cls)=>has(txt)?`<span class="bm-chip ${cls||tone(txt)}">${E(String(txt))}</span>`:"";
  const fld=(k,v,raw)=>has(v)?`<div class="bm-k">${E(k)}</div><div class="bm-v">${raw?v:E(String(v))}</div>`:"";
  const kv=rows=>{const body=rows.filter(Boolean).join(""); return body?`<div class="bm-kv">${body}</div>`:"";};
  const sec=t=>`<div class="bm-sec">${E(t)}</div>`;
  const empty=t=>`<div class="bm-empty">${t}</div>`;
  const dep=p=>`<a class="bm-dep" href="tache.html?code=${encodeURIComponent(p)}">${E(p)}</a>`;

  const parent = (m.parent && window.byNdeg) ? window.byNdeg[m.parent] : null;
  const scores = window.calcBriefScores(m, parent);

  const bc = m.briefClient || {}, dc = m.briefCreatif || {}, bp = m.briefProduction || {}, cs = m.caseStudy || {};
  const bcP = parent ? (parent.briefClient || {}) : {}, dcP = parent ? (parent.briefCreatif || {}) : {}, bpP = parent ? (parent.briefProduction || {}) : {}, csP = parent ? (parent.caseStudy || {}) : {};

  const getFld = (obj, pObj, k) => {
    if (obj && obj[k] != null && String(obj[k]).trim() !== "") {
      return { val: obj[k], inherited: false };
    }
    if (pObj && pObj[k] != null && String(pObj[k]).trim() !== "") {
      return { val: pObj[k], inherited: true };
    }
    return null;
  };

  const fldJ = (lbl, obj, pObj, k) => {
    const res = getFld(obj, pObj, k);
    if (!res) return "";
    return `<div class="bm-k">${E(lbl)}</div><div class="bm-v">${E(res.val)}${res.inherited ? ' <span style="font-size:10px;color:var(--fg3);font-style:italic">· hérité</span>' : ''}</div>`;
  };

  const isMaster=(m.entree==="Maître")||!m.parent;
  const dem=resp(m.entrePar), who=resp(m.responsable);
  const zone=[m.cluster,m.pays].filter(Boolean).join(" · ");
  const dl=has(m.deadline)?E(m.deadline)+(m.deadlineHard?` <span class="bm-flag">⚑ exigée client</span>`:""):"";

  // ── Brief client : la demande, reconstituée ──
  const be=(m.briefEtat||"").toLowerCase();
  const beChip=isMaster ? (be==="validé"?chip("Brief validé","ok"):be==="absent"?chip("Brief absent","mut"):chip("Brief déduit · à valider","warn")) : "";
  
  const hasClientDocs = [
    "contexte_business", "contexte_marque", "contexte_market", "contexte_com",
    "probleme_marketing", "obj_business", "obj_marketing", "obj_communication",
    "cible_principale", "cible_secondaire", "cible_socio_eco", "cible_situation",
    "cible_frein", "cible_motivation", "cible_langage", "insight_client", "big_idea"
  ].some(k => getFld(bc, bcP, k) !== null);

  const viewClient = (beChip?`<div class="bm-meta">${beChip}</div>`:"")+sec("La demande")+
    (hasClientDocs ? kv([
      fldJ("Contexte Business", bc, bcP, "contexte_business"),
      fldJ("Contexte Marque", bc, bcP, "contexte_marque"),
      fldJ("Contexte Marché", bc, bcP, "contexte_market"),
      fldJ("Contexte Comm", bc, bcP, "contexte_com"),
      fldJ("Problème Marketing", bc, bcP, "probleme_marketing"),
      fldJ("Objectif Business", bc, bcP, "obj_business"),
      fldJ("Objectif Marketing", bc, bcP, "obj_marketing"),
      fldJ("Objectif Comm", bc, bcP, "obj_communication"),
      fldJ("Cibles", bc, bcP, "cible_principale"),
      fldJ("Insight Client", bc, bcP, "insight_client"),
      fldJ("Big Idea", bc, bcP, "big_idea"),
      fldJ("Axe 1", bc, bcP, "axe1_nom"),
      fldJ("Axe 1 Promesse", bc, bcP, "axe1_promesse"),
      fldJ("Axe 1 Copy", bc, bcP, "axe1_copy_p"),
      fldJ("Axe 2", bc, bcP, "axe2_nom"),
      fldJ("Axe 2 Promesse", bc, bcP, "axe2_promesse"),
      fldJ("Axe 2 Copy", bc, bcP, "axe2_copy_p"),
    ]) : kv([
      fld("Client",J([m.client,m.marque])),
      fld("Marché",zone),
      fld("Objet",m.projet),
      fld("Type · niveau",[m.type,m.niveau].filter(Boolean).join(" · ")),
      fld("Priorité",m.prio),
      fld("Demandé par",dem||"non renseigné"),
      fld("Traité par",who||"non assigné"),
      fld("Livrables",m.livrables||"(à préciser)"),
      fld("Contexte",ctx||"—"),
      fld("Réception",m.date),
      fld("Échéance",dl,true),
    ]))+(!isMaster&&m.parent?`<div class="bm-note">Brief porté par le projet maître ${dep(m.parent)}.</div>`:"");

  // ── DA / Créa : direction créative ──
  const hasCreaDocs = ["message_claim", "challenge_creatif", "principe_creatif", "concept1_nom", "reco_agence"].some(k => getFld(dc, dcP, k) !== null);
  
  const viewCrea=`<div class="bm-meta">${chip(m.docPropal||"Propal à créer",docTone(m.docPropal))}</div>`+sec("Direction créative")+
    (hasCreaDocs ? kv([
      fldJ("Message / claim", dc, dcP, "message_claim"),
      fldJ("Challenge Créatif", dc, dcP, "challenge_creatif"),
      fldJ("Principe Créatif", dc, dcP, "principe_creatif"),
      fldJ("Concept 1", dc, dcP, "concept1_nom"),
      fldJ("Croisement C1", dc, dcP, "concept1_croisement"),
      fldJ("Niveau C1 Safe", dc, dcP, "concept1_safe"),
      fldJ("Niveau C1 Reco", dc, dcP, "concept1_reco"),
      fldJ("Niveau C1 Big Money", dc, dcP, "concept1_money"),
      fldJ("Concept 2", dc, dcP, "concept2_nom"),
      fldJ("Croisement C2", dc, dcP, "concept2_croisement"),
      fldJ("Recommandation", dc, dcP, "reco_agence")
    ]) : (has(m.projet)?`<div class="bm-k" style="margin-bottom:5px">Message / claim</div><blockquote class="bm-claim">${E(m.projet)}</blockquote>`:"")+kv([
      fld("Type de création",m.type),
      fld("Niveau",m.niveau),
      fld("Territoire",J([m.marque,m.client])),
      fld("Zone",zone),
    ]))+`<div class="bm-note">Pistes, rationale et mockups détaillés → <a href="tache.html?code=${encodeURIComponent(m.ndeg)}">fiche complète</a>.</div>`;

  // ── Production ──
  const prodMeta=[m.statut?chip(m.statut,tone(m.statut)):"", chip("Livrables : "+(has(m.docLivr)?m.docLivr:"à créer"),docTone(m.docLivr))].filter(Boolean).join("");
  const deps=window.parseDeps?window.parseDeps(m.dependsOn):[];
  const hasProdDocs = ["livrable_principal", "nb_slides", "ratio", "plateformes"].some(k => getFld(bp, bpP, k) !== null);

  const viewProd=`<div class="bm-meta">${prodMeta}</div>`+sec("Production")+
    (hasProdDocs ? kv([
      fldJ("Livrable Principal", bp, bpP, "livrable_principal"),
      fldJ("Nb de slides", bp, bpP, "nb_slides"),
      fldJ("Ratio", bp, bpP, "ratio"),
      fldJ("Plateformes", bp, bpP, "plateformes"),
      fldJ("Échéance prod", bp, bpP, "deadline_prod"),
      fldJ("Responsable prod", bp, bpP, "responsable_prod"),
      fldJ("Statut prod", bp, bpP, "status_production"),
      fldJ("Export", bp, bpP, "spec_export"),
      fldJ("Naming", bp, bpP, "spec_naming"),
    ]) : kv([
      fld("Livrables",m.livrables),
      fld("Avancement",m.avancement),
      fld("Traité par",who),
      fld("Échéance",dl,true),
      fld("Réception",m.date),
      m.closedAt?fld("Fermé le",m.closedAt):"",
      deps.length?fld("Dépend de",`<div class="bm-deps">${deps.map(dep).join("")}</div>`,true):"",
    ]));

  // ── Case study ──
  const hasCaseDocs = ["challenge", "insight", "strategie", "big_idea"].some(k => getFld(cs, csP, k) !== null);
  const viewCaseStudy = sec("Case Study")+
    (hasCaseDocs ? kv([
      fldJ("Challenge", cs, csP, "challenge"),
      fldJ("Insight", cs, csP, "insight"),
      fldJ("Stratégie", cs, csP, "strategie"),
      fldJ("Big Idea", cs, csP, "big_idea"),
      fldJ("Concept Retenu", cs, csP, "concept_retenu"),
      fldJ("Exécution", cs, csP, "execution"),
      fldJ("KPI Portée", cs, csP, "kpi_portee"),
      fldJ("KPI Impressions", cs, csP, "kpi_impressions"),
      fldJ("KPI Engagement", cs, csP, "kpi_engagement"),
      fldJ("Learnings OK", cs, csP, "learning_ok"),
      fldJ("Learnings à améliorer", cs, csP, "learning_improve")
    ]) : empty("Aucune donnée de case study pour le moment. À documenter sur la fiche complète."));

  const VIEWS={client:viewClient,crea:viewCrea,prod:viewProd,caseStudy:viewCaseStudy};
  const TABS=[
    {k:"client",l:`Brief client (${scores.client}%)`},
    {k:"crea",l:`DA / Créa (${scores.crea}%)`},
    {k:"prod",l:`Production (${scores.prod}%)`},
    {k:"caseStudy",l:`Case study (${scores.caseStudy}%)`}
  ];
  const sub=J([m.marque,m.client]);
  bd.innerHTML=`<div class="bm" role="dialog" aria-modal="true">
    <div class="bm-h"><div class="c">${E(m.ndeg)}${m.entree&&m.entree!=="Maître"?" · "+E(m.entree)+(m.parent?" de "+E(m.parent):""):""}</div>
      <h2>${E(m.projet||"sans titre")}</h2><div class="s">${E(sub)}${m.statut?" · "+E(m.statut):""}${m.deadline?" · échéance "+E(m.deadline):""}</div></div>
    <div class="bm-tabs" id="bm-tabs">${TABS.map((t,i)=>`<button class="bm-tab${i===0?' on':''}" data-f="${t.k}">${E(t.l)}</button>`).join("")}</div>
    <div class="bm-body"><div id="bm-md">${VIEWS.client}</div></div>
    <div class="bm-f"><button class="bm-x" id="bm-x">Fermer</button><a class="bm-open" href="tache.html?code=${encodeURIComponent(m.ndeg)}"><i data-lucide="maximize-2" style="width:15px;height:15px"></i>Fiche complète</a></div>
  </div>`;
  bd.classList.add("show");
  if(window.lucide) window.lucide.createIcons();
  function show(key){
    bd.querySelectorAll(".bm-tab").forEach(b=>b.classList.toggle("on",b.getAttribute("data-f")===key));
    const md=document.getElementById("bm-md"); if(!md)return; md.innerHTML=VIEWS[key]||empty("—");
    const body=md.closest(".bm-body"); if(body) body.scrollTop=0;
  }
  bd.querySelector("#bm-tabs").addEventListener("click",e=>{ const b=e.target.closest("[data-f]"); if(b) show(b.getAttribute("data-f")); });
  bd.querySelector("#bm-x").addEventListener("click",()=>bd.classList.remove("show"));
  show("client");
};

window.openGlobalInspirationModal = function(m) {
  const bc = m.briefClient || m.brief_client || {};
  const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  
  const old = document.getElementById("global-inspiration-modal");
  if(old) old.remove();

  const html = `
    <div class="mtg-modal-overlay" id="global-inspiration-modal">
      <div class="mtg-modal">
        <div class="mtg-modal-header">
          <h3 class="mtg-modal-title">💡 Inspiration & Concept Concepteur Rédacteur</h3>
          <button type="button" class="mtg-modal-close" id="close-global-insp-x" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="mtg-modal-body">
          
          <!-- Big Idea -->
          <div class="mtg-ideabox">
            <div class="mtg-ideabox-title">Big Idea Marketing / Concept</div>
            <div class="mtg-ideabox-content">« ${esc(bc.big_idea || "Non spécifié") } »</div>
          </div>

          <!-- Insight Client -->
          <div class="mtg-info-card" style="border-left: 4px solid var(--info)">
            <div class="mtg-info-card-title" style="color: var(--info)">Insight Client / Vérité Humaine</div>
            <div class="mtg-info-card-text">« ${esc(bc.insight_client || "Non spécifié") } »</div>
          </div>

          <!-- Contexte Résumé -->
          <div class="mtg-grid-2col">
            <div class="mtg-info-card">
              <div class="mtg-info-card-title">Problème Marketing</div>
              <div class="mtg-info-card-text">${esc(bc.probleme_marketing || "Non spécifié")}</div>
            </div>
            <div class="mtg-info-card">
              <div class="mtg-info-card-title">Cibles & Motivations</div>
              <div class="mtg-info-card-text"><b>Principale :</b> ${esc(bc.cible_principale || "Non spécifié")}
<b>Situation :</b> ${esc(bc.cible_situation || "—")}
<b>Motivation :</b> ${esc(bc.cible_motivation || "—")}</div>
            </div>
          </div>

          <!-- Axes créatifs et Copywriting -->
          <div class="mtg-grid-2col">
            <!-- Axe 1 -->
            <div class="mtg-axecard">
              <div class="mtg-axecard-header">
                <span class="mtg-axecard-badge" style="background:#e0f2fe;color:#0369a1">Axe 1</span>
                <span class="mtg-axecard-title">${esc(bc.axe1_nom || "Axe 1")}</span>
              </div>
              <div class="mtg-axecard-item">
                <div class="mtg-axecard-lbl">Intention</div>
                <div class="mtg-axecard-val">${esc(bc.axe1_intention || "—")}</div>
              </div>
              <div class="mtg-axecard-item">
                <div class="mtg-axecard-lbl">Promesse cible</div>
                <div class="mtg-axecard-val">${esc(bc.axe1_promesse || "—")}</div>
              </div>
              <div class="mtg-axecard-item">
                <div class="mtg-axecard-lbl">Copy Principale</div>
                <div class="mtg-axecard-copy">« ${esc(bc.axe1_copy_p || "Non spécifiée")} »</div>
              </div>
            </div>

            <!-- Axe 2 -->
            <div class="mtg-axecard">
              <div class="mtg-axecard-header">
                <span class="mtg-axecard-badge" style="background:#fef3c7;color:#b45309">Axe 2</span>
                <span class="mtg-axecard-title">${esc(bc.axe2_nom || "Axe 2")}</span>
              </div>
              <div class="mtg-axecard-item">
                <div class="mtg-axecard-lbl">Intention</div>
                <div class="mtg-axecard-val">${esc(bc.axe2_intention || "—")}</div>
              </div>
              <div class="mtg-axecard-item">
                <div class="mtg-axecard-lbl">Promesse cible</div>
                <div class="mtg-axecard-val">${esc(bc.axe2_promesse || "—")}</div>
              </div>
              <div class="mtg-axecard-item">
                <div class="mtg-axecard-lbl">Copy Principale</div>
                <div class="mtg-axecard-copy">« ${esc(bc.axe2_copy_p || "Non spécifiée")} »</div>
              </div>
            </div>
          </div>

        </div>
        <div class="mtg-modal-footer">
          <button type="button" class="dr-btn" id="close-global-insp-btn" style="border: 1px solid var(--border)">Fermer</button>
          <button type="button" class="dr-btn primary" id="cta-global-insp-btn"><i data-lucide="edit-3" style="width:15px;height:15px;vertical-align:middle;margin-right:4px"></i>Rédiger le brief créatif</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);
  const overlay = document.getElementById("global-inspiration-modal");
  
  requestAnimationFrame(() => {
    if(overlay) overlay.classList.add("show");
  });

  const closeFn = () => {
    if(overlay) {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 250);
    }
  };

  document.getElementById("close-global-insp-x").onclick = closeFn;
  document.getElementById("close-global-insp-btn").onclick = closeFn;
  overlay.onclick = (e) => { if(e.target === overlay) closeFn(); };

  document.getElementById("cta-global-insp-btn").onclick = () => {
    closeFn();
    if(window.location.pathname.includes("tache.html")) {
      if(typeof window.switchTab === "function") {
        window.switchTab("da-crea");
        setTimeout(() => {
          const claimInput = document.getElementById("e-dc-message_claim");
          if(claimInput) {
            claimInput.focus();
            claimInput.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 120);
      }
    } else {
      window.location.href = `tache.html?code=${encodeURIComponent(m.ndeg)}&tab=da-crea`;
    }
  };

  if(window.lucide) window.lucide.createIcons();
};

window.isCreativeTask = function(m) {
  if (!m) return false;
  const bc = m.briefClient || m.brief_client;
  const type = (m.type || "").toLowerCase().trim();
  const creativeTypes = ["création kv", "creation kv", "da campaign", "packaging", "production vidéo", "production video", "pitch"];
  return creativeTypes.includes(type) || (bc && (!!bc.big_idea || !!bc.insight_client || !!bc.axe1_copy_p || !!bc.axe2_copy_p));
};

window.showGlobalInspiration = function(ndeg) {
  const map = (typeof byNdeg !== 'undefined' ? byNdeg : (typeof BYNDEG !== 'undefined' ? BYNDEG : (typeof window.byNdeg !== 'undefined' ? window.byNdeg : (typeof window.BYNDEG !== 'undefined' ? window.BYNDEG : {}))));
  const m = map[ndeg];
  if (!m) {
    alert("Impossible de charger les données du brief pour " + ndeg);
    return;
  }
  window.openGlobalInspirationModal(m);
};

})();  // fin IIFE ui.js
