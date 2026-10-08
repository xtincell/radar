"use strict";
/* ============================================================
   Accès données — API REST maison, même origine (mini-PostgREST).
   Aucune clé ni secret côté client : le mur d'authentification
   (cookie de session) fait foi, pas un header apikey.
   Charge depuis la table public.briefs ; repli sur INDEX.csv.
   ============================================================ */
window.SUPA = {
  url: "",   // MÊME ORIGINE : backend maison /rest/v1
  key: "",   // envoyé en apikey ; ignoré par le backend maison (le mur fait foi)
  table: "briefs"
};
window.SUPA_SOURCE = ""; // "supabase" | "csv" | "vide"
const _rest = p => SUPA.url + "/rest/v1/" + p;
/* Identité au niveau base : on demande au mur (/token) un JWT par utilisateur, on le
   SONDE (la base l'accepte-t-elle ?) puis on l'utilise comme Authorization. À défaut
   (secret non configuré, JWT rejeté, hors-ligne) → repli sur la clé anon : l'app
   continue de marcher exactement comme avant. Aucune régression possible. */
window.MTG_TOKEN = "";
let _tokenTried = false;
async function ensureToken(){
  if(_tokenTried) return window.MTG_TOKEN;
  _tokenTried = true;
  try{
    const r = await fetch("/token", {cache:"no-store"});
    if(r.ok){ const d = await r.json();
      if(d && d.ok && d.token){
        // sonde : PostgREST accepte-t-il ce JWT ? si oui on bascule, sinon on garde l'anon.
        const t = await fetch(_rest(SUPA.table+"?select=id&limit=1"), {headers:{apikey:SUPA.key, Authorization:"Bearer "+d.token}});
        if(t.ok){ window.MTG_TOKEN = d.token; window.MTG_AUTH = {role:d.role, person:d.person}; }
      }
    }
  }catch(e){}
  return window.MTG_TOKEN;
}
window.ensureToken = ensureToken;
function supaHeaders(extra){ const auth = window.MTG_TOKEN || SUPA.key; return Object.assign({apikey:SUPA.key, Authorization:"Bearer "+auth}, extra||{}); }

// row Supabase (snake_case) -> objet front (mêmes champs que l'ancien parse INDEX.csv)
function _map(d){ return {
  id:d.id, categorie:d.categorie||"", closedAt:d.closed_at||"",
  ndeg:d.ndeg||"", client:d.client||"", marque:d.marque||"", cluster:d.cluster||"", pays:d.pays||"",
  projet:d.projet||"", niveau:d.niveau||"", type:d.type||"", statut:d.statut||"", prio:d.prio||"",
  avancement:d.avancement||"", deadline:d.deadline||"", responsable:d.responsable||"", livrables:d.livrables||"",
  date:d.date_reception||"", threadId:d.thread_id||"", entree:d.entree||"", parent:d.parent||"",
  comm:d.comm||"", commentaires:d.comm||"", entrePar:d.entre_par||"",
  docBrief:d.doc_brief||"", docPropal:d.doc_propal||"", docLivr:d.doc_livr||"",
  dependsOn:d.depends_on||"", createdAt:d.created_at||"", updatedAt:d.updated_at||"", briefEtat:d.brief_etat||"", classifInferee:!!d.classif_inferee, deadlineHard:!!d.deadline_hard,
  briefClient:d.brief_client||{}, briefCreatif:d.brief_creatif||{}, briefProduction:d.brief_production||{}, caseStudy:d.case_study||{},
  suivi:d.suivi||{}, privateTo:d.private_to||"", detail:"" }; }

// repli CSV (même schéma INDEX.csv)
function _parseCSV(t){ t=t.replace(/\r\n/g,"\n").replace(/\r/g,"\n"); const rows=[]; let i=0,f="",row=[],q=false;
  while(i<t.length){ const c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){f+='"';i+=2;continue;} q=false;i++;continue;} f+=c;i++;continue; }
    if(c==='"'){q=true;i++;continue;} if(c===','){row.push(f);f="";i++;continue;}
    if(c==='\n'){row.push(f);rows.push(row);row=[];f="";i++;continue;} f+=c;i++; }
  if(f.length||row.length){row.push(f);rows.push(row);} return rows; }
function _csvToBriefs(text){ const rows=_parseCSV(text); if(!rows.length) return [];
  const h=rows[0].map(x=>x.trim()); const ix=n=>h.indexOf(n);
  const C={ndeg:ix("N°"),client:ix("Client"),marque:ix("Marque"),cluster:ix("Cluster"),pays:ix("Pays"),projet:ix("Projet"),
    niveau:ix("Niveau"),type:ix("Type"),statut:ix("Statut"),prio:ix("Priorité"),avancement:ix("Avancement"),deadline:ix("Deadline"),
    responsable:ix("Responsable"),livrables:ix("Livrables"),date:ix("Date réception"),thread:ix("threadId"),entree:ix("Type entrée"),
    parent:ix("Rattaché à"),comm:ix("Commentaires"),db:ix("Doc-Brief"),dp:ix("Doc-Propal"),dl:ix("Doc-Livr"),ep:ix("Entré par")};
  const g=(c,j)=>(j>=0&&j<c.length?(c[j]||"").trim():""); const out=[];
  for(let i=1;i<rows.length;i++){ const c=rows[i]; if(!c||g(c,C.ndeg)==="") continue;
    out.push({ndeg:g(c,C.ndeg),client:g(c,C.client),marque:g(c,C.marque),cluster:g(c,C.cluster),pays:g(c,C.pays),
      projet:g(c,C.projet),niveau:g(c,C.niveau),type:g(c,C.type),statut:g(c,C.statut),prio:g(c,C.prio),
      avancement:g(c,C.avancement),deadline:g(c,C.deadline),responsable:g(c,C.responsable),livrables:g(c,C.livrables),
      date:g(c,C.date),threadId:g(c,C.thread),entree:g(c,C.entree),parent:g(c,C.parent),
      comm:g(c,C.comm),commentaires:g(c,C.comm),entrePar:g(c,C.ep),
      docBrief:g(c,C.db),docPropal:g(c,C.dp),docLivr:g(c,C.dl),detail:""}); }
  return out; }

// tri cohérent des ndeg : on neutralise le préfixe "≈" (doublons) et on trie numériquement
function _byNdeg(a,b){
  const na=(a.ndeg||"").replace(/^≈/,""), nb=(b.ndeg||"").replace(/^≈/,"");
  return na.localeCompare(nb, undefined, {numeric:true, sensitivity:"base"});
}
/* ============================================================
   Périmètre de vue par NIVEAU D'AUTORITÉ (owner / supervisor / member).
   Le niveau vient de /profil (défini côté serveur dans functions/_authz.js,
   d'après l'email authentifié — non falsifiable côté client).
     • owner       → voit TOUT (toutes les tâches + les évaluations RH /rh, gated serveur)
     • supervisor  → voit TOUTES LES TÂCHES (toutes périodes) — PAS les évaluations RH
     • member      → voit SES tâches (seul ou co-responsable) du mois en cours
   Appliqué dans loadBriefsLive → toutes les pages héritent du filtre sans
   modification. Réglage des niveaux : functions/_authz.js (table PEOPLE).
   ============================================================ */
window.MTG_IDENTITY = null;
async function loadIdentity(){
  if(window.MTG_IDENTITY) return window.MTG_IDENTITY;
  try{
    const r=await fetch("/profil",{cache:"no-store"});
    if(r.ok){ const d=await r.json();
      if(d && d.ok){ window.MTG_IDENTITY={email:d.email||"",person:d.person||"",role:d.role||"member",taskMonth:d.taskMonth||""}; return window.MTG_IDENTITY; } }
  }catch(e){}
  // Une identité indisponible n'accorde jamais un rôle administrateur.
  window.MTG_IDENTITY={email:"",person:"",role:"member"};
  return window.MTG_IDENTITY;
}
function _monthKey(d){ d=d||new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
function _isDone(b){ return typeof window.isDoneBrief==="function" ? window.isDoneBrief(b) : false; }
function _isFrozen(b){ return typeof window.isFrozen==="function" ? window.isFrozen(b) : (!!b && b.statut==="Frozen"); }
/* « Périmètre mois » : daté ce mois-ci, OU sans date calendaire mais encore ouvert
   (travail courant non planifié). Exclut le daté d'autres mois et le clos/gelé non-daté. */
function _inCurrentMonth(b){
  const dl=String((b&&b.deadline)||"");
  if(/^\d{4}-\d{2}/.test(dl)) return dl.slice(0,7)===(window.MTG_IDENTITY?.taskMonth||_monthKey());
  return !_isDone(b) && !_isFrozen(b);
}
async function _applyScope(rows){
  const id=await loadIdentity();
  const me=id?id.person:"";
  /* Garde CONFIDENTIALITÉ — passe AVANT le niveau d'autorité : une ligne marquée
     private_to = X n'est visible QUE par X, même pour un owner ou un superviseur.
     Le serveur applique aussi ce périmètre à l'API, au CSV et aux médias. */
  rows = rows.filter(r=>{ const p=String(r&&r.privateTo||"").trim(); return !p || p===me; });
  if(!id || id.role==="owner") return rows;                       // accès total
  if(id.role==="supervisor") return rows;                         // TOUTES les tâches (vue ouverte aux superviseurs, toutes périodes)
  if(!me) return [];                                              // member sans nom : rien
  const owns = typeof window.ownsTask==="function"
    ? (r=>window.ownsTask(r.responsable, me))
    : (r=>String(r&&r.responsable||"").split(/\s*[/&;]\s*|\s+et\s+/).map(x=>x.trim()).includes(me));
  return rows.filter(r=>owns(r) && _inCurrentMonth(r));
}
window.loadIdentity=loadIdentity; window.MTG_monthKey=_monthKey; window.MTG_scopeRows=_applyScope;

async function _loadBriefsRaw(){
  window.SUPA_ERROR="";
  try{
    const r=await fetch(_rest(SUPA.table+"?select=*&order=ndeg.asc&limit=5000"),{headers:supaHeaders(),cache:"no-store"});
    if(r.ok){ const d=await r.json();
      // r.ok fait foi : on est en LIVE même si la base renvoie 0 ligne (état valide).
      if(Array.isArray(d)){ SUPA_SOURCE="supabase"; return d.map(_map).sort(_byNdeg); }
    } else { window.SUPA_ERROR="HTTP "+r.status; }
  }catch(e){ window.SUPA_ERROR=(e&&e.message)||String(e); console.error("[supa] base live injoignable:",e); }
  try{ const r=await fetch("INDEX.csv",{cache:"no-store"}); if(r.ok){ SUPA_SOURCE="csv"; return _csvToBriefs(await r.text()).sort(_byNdeg); } }catch(e){ console.error("[supa] repli CSV KO:",e); }
  SUPA_SOURCE="vide"; return [];
}
// API publique inchangée : renvoie les lignes DÉJÀ filtrées selon le niveau d'autorité.
async function loadBriefsLive(){ await ensureToken(); await loadConfig(); return _applyScope(await _loadBriefsRaw()); }
// insertion (tickets). rows = tableau d'objets snake_case (colonnes de la table)
async function insertBriefs(rows){
  await ensureToken();
  const r=await fetch(_rest(SUPA.table),{method:"POST",
    headers:supaHeaders({"Content-Type":"application/json",Prefer:"return=representation"}),
    body:JSON.stringify(rows)});
  if(!r.ok) throw new Error("Supabase insert "+r.status+" : "+await r.text());
  return r.json();
}
// modif d'une ligne par id (patch = colonnes snake_case)
async function updateBrief(id, patch){
  await ensureToken();
  const r=await fetch(_rest(SUPA.table+"?id=eq."+encodeURIComponent(id)),{method:"PATCH",
    headers:supaHeaders({"Content-Type":"application/json",Prefer:"return=representation"}),
    body:JSON.stringify(patch)});
  if(!r.ok) throw new Error("Supabase update "+r.status+" : "+await r.text());
  return r.json();
}
async function deleteBrief(id){
  await ensureToken();
  const r=await fetch(_rest(SUPA.table+"?id=eq."+encodeURIComponent(id)),{method:"DELETE",headers:supaHeaders()});
  if(!r.ok) throw new Error("Supabase delete "+r.status+" : "+await r.text());
  return true;
}
// ---- Wiki clients (table public.clients) : source de vérité des fiches ----
async function loadClients(){
  const r=await fetch(_rest("clients?select=*&order=ordre.asc"),{headers:supaHeaders(),cache:"no-store"});
  if(!r.ok) throw new Error("clients "+r.status); return r.json();
}
async function updateClient(id, patch){
  patch.updated_at=new Date().toISOString();
  const r=await fetch(_rest("clients?id=eq."+encodeURIComponent(id)),{method:"PATCH",
    headers:supaHeaders({"Content-Type":"application/json",Prefer:"return=representation"}),
    body:JSON.stringify(patch)});
  if(!r.ok) throw new Error("Supabase clients update "+r.status+" : "+await r.text());
  return r.json();
}

window.loadBriefsLive=loadBriefsLive; window.insertBriefs=insertBriefs; window.supaHeaders=supaHeaders;
window.updateBrief=updateBrief; window.deleteBrief=deleteBrief;
window.loadClients=loadClients; window.updateClient=updateClient;
// ---- savoir marché en data (client_markets / client_contacts) : alimente le wiki + les zones de brief ----
async function loadMarkets(client){
  const flt = client ? "&client=eq."+encodeURIComponent(client) : "";
  const r=await fetch(_rest("client_markets?select=*&order=id.asc"+flt),{headers:supaHeaders(),cache:"no-store"});
  if(!r.ok) throw new Error("client_markets "+r.status); return r.json();
}
async function loadContacts(client){
  const flt = client ? "&client=eq."+encodeURIComponent(client) : "";
  const r=await fetch(_rest("client_contacts?select=*&order=id.asc"+flt),{headers:supaHeaders(),cache:"no-store"});
  if(!r.ok) throw new Error("client_contacts "+r.status); return r.json();
}
window.loadMarkets=loadMarkets; window.loadContacts=loadContacts;
// ---- commentaires / observations par tâche (table public.comments) ----
async function loadComments(ndeg){
  const r=await fetch(_rest("comments?select=*&ndeg=eq."+encodeURIComponent(ndeg)+"&order=created_at.asc"),{headers:supaHeaders(),cache:"no-store"});
  if(!r.ok) throw new Error("comments "+r.status); return r.json();
}
async function addComment(c){
  await ensureToken();
  const r=await fetch(_rest("comments"),{method:"POST",
    headers:supaHeaders({"Content-Type":"application/json",Prefer:"return=representation"}),
    body:JSON.stringify(c)});
  if(!r.ok) throw new Error("Supabase comment insert "+r.status+" : "+await r.text());
  return r.json();
}
async function deleteComment(id){
  await ensureToken();
  const r=await fetch(_rest("comments?id=eq."+encodeURIComponent(id)),{method:"DELETE",headers:supaHeaders()});
  if(!r.ok) throw new Error("Supabase comment delete "+r.status+" : "+await r.text());
  return true;
}
// tous les commentaires liés à une personne : qu'elle en soit l'auteur OU qu'elle figure
// dans « involved » (personnes impliquées). Deux requêtes fusionnées + dédoublonnées par id.
async function loadCommentsByPerson(name){
  if(!name) return [];
  const enc=encodeURIComponent(name);
  const inv=encodeURIComponent("{"+JSON.stringify(name)+"}");   // array literal Postgres : {"Nom"}
  const urls=[
    _rest("comments?select=*&author=eq."+enc),
    _rest("comments?select=*&involved=cs."+inv)
  ];
  const res=await Promise.all(urls.map(u=>fetch(u,{headers:supaHeaders(),cache:"no-store"})));
  const lists=await Promise.all(res.map(r=>r.ok?r.json():[]));
  const seen=new Set(), out=[];
  lists.flat().forEach(c=>{ if(c && !seen.has(c.id)){ seen.add(c.id); out.push(c); } });
  out.sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")));   // plus récent d'abord
  return out;
}
window.loadComments=loadComments; window.addComment=addComment; window.deleteComment=deleteComment;
window.loadCommentsByPerson=loadCommentsByPerson;
// ---- config applicative (app_config) : couleurs clients, équipe, statuts, types — surcharge les défauts d'ui.js ----
window.MTG_CFG = null;
async function loadConfig(){
  if(window.MTG_CFG) return window.MTG_CFG;
  try{
    const r=await fetch(_rest("app_config?select=key,value"),{headers:supaHeaders(),cache:"no-store"});
    if(r.ok){ const rows=await r.json(); const c={};
      (rows||[]).forEach(x=>{ let v=x.value; if(typeof v==="string"){ try{ v=JSON.parse(v); }catch(e){} } c[x.key]=v; });   // tolère value en text OU jsonb
      window.MTG_CFG=c;
      if(c.clients && typeof c.clients==="object"){ const m={}; Object.keys(c.clients).forEach(k=>{ const v=c.clients[k]; m[k]=(v&&v.var)?v.var:v; }); window.CLIENT_VAR=m; }
      if(Array.isArray(c.statuts)) window.STATUTS=c.statuts;
      if(c.statut_colors && typeof c.statut_colors==="object") window.STATUT_COL=Object.assign({"":"var(--st-recu)"}, c.statut_colors);
      if(Array.isArray(c.types))   window.TYPES=c.types;
      if(Array.isArray(c.team))    window.TEAM_BASE=c.team;
      return c;
    }
  }catch(e){}
  window.MTG_CFG=window.MTG_CFG||{}; return window.MTG_CFG;
}
window.loadConfig=loadConfig;
