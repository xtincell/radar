"use strict";
/* ===========================================================
   Radar v2 — logic
   Reads window.BRIEFS (from data.js). Vanilla JS.
   =========================================================== */

const TODAY = new Date(new Date().toDateString());
const DONE_STATUS = new Set(["Livré","Livré (cycle)","Validé","Bouclé","Archivé"]);
const CLOSED_STATUS = new Set(["Envoyé dans Slack","Livré","Livré (cycle)","Validé","Bouclé"]); // "traités"
const isFrozen = m => m.statut==="Frozen" || m.statut==="Gelé";   // gelé : ni actif, ni traité

const CLIENT_VAR = {};
const clientVar = c => CLIENT_VAR[c] || "--c-other";
const clientCol = c => `var(${clientVar(c)})`;

const STATUT_COL = {
  "En cours":"var(--st-cours)","En attente client":"var(--st-attente)","Reçu":"var(--st-recu)",
  "Bloqué":"var(--st-bloque)","Livré":"var(--st-livre)","Livré (cycle)":"var(--st-livre)",
  "Validé":"var(--st-livre)","Bouclé":"var(--st-boucle)","Envoyé dans Slack":"var(--st-slack)","Frozen":"var(--st-frozen)","Archivé":"var(--st-archive)","":"var(--st-recu)"
};
const ACTIVE_STATUSES = ["En cours","En attente client","Reçu","Bloqué"];
const STATUT_OPTS = ["Reçu","En cours","En attente client","Bloqué","Envoyé dans Slack","Livré","Validé","Bouclé","Frozen","Archivé"];
// date locale (Douala UTC+1) — pas d'UTC (corrige un décalage de jour sur closed_at)
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

const $ = s => document.querySelector(s);
const esc = s => (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---- triage (local) ----
const TKEY = "radar:radar:done:";
const isTraite = nd => { try { return localStorage.getItem(TKEY+nd)==="1"; } catch(e){ return false; } };
const setTraite = (nd,v) => { try { v?localStorage.setItem(TKEY+nd,"1"):localStorage.removeItem(TKEY+nd); } catch(e){} };

const effDone = m => DONE_STATUS.has(m.statut) || isTraite(m.ndeg);
const hasDL = m => /^\d{4}-\d{2}-\d{2}$/.test(m.deadline||"");
const isLate = m => hasDL(m) && !effDone(m) && new Date(m.deadline) < TODAY;
const daysLate = m => Math.round((TODAY - new Date(m.deadline))/864e5);

// urgency classification for queue
function urgency(m){
  if (isLate(m)) return {tag:"late", rank:0};
  if (m.statut==="Bloqué") return {tag:"block", rank:1};
  if (m.prio==="P0") return {tag:"p0", rank:2};
  if (m.statut==="En attente client") return {tag:"wait", rank:3};
  if (m.prio==="P1") return {tag:"p1", rank:4};
  return {tag:"normal", rank:5};
}
const URG_LABEL = {late:"En retard",block:"Bloqué",p0:"P0",wait:"Attente client",p1:"P1",normal:""};
const URG_CLS = {late:"urg-late",block:"urg-block",p0:"urg-p0",wait:"urg-wait",p1:"urg-p1"};

function normResp(r){
  if(!r) return "";
  return r.trim();
}

const state = { client:"", q:"", seg:"all" };
let MASTERS = [];

// ---- scope ----
function scopeMasters(){
  const q = state.q.toLowerCase().trim();
  return MASTERS.filter(m=>{
    if(state.client && m.client!==state.client) return false;
    if(q){
      const hay = (m.ndeg+" "+m.projet+" "+m.marque+" "+m.client+" "+m.responsable+" "+m.livrables+" "+m.comm).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

// =================== RENDER ===================
function render(){
  const scope = scopeMasters();
  const active = scope.filter(m=>!effDone(m)&&!isFrozen(m));
  renderMast(scope, active);
  renderStats(scope, active);
  renderQueue(active);
  renderRing(scope);
  renderEch(active);
  renderClients(scope);
  renderPipe(scope);
  renderBlocked(active);
  renderTeam(scope);
  if(window.lucide) window.lucide.createIcons();
}

function renderMast(scope, active){
  const late = active.filter(isLate).length;
  const p0 = active.filter(m=>m.prio==="P0").length;
  const chip = $("#filterchip");
  if(state.client){
    chip.classList.add("show");
    chip.querySelector(".dot").style.background = clientCol(state.client);
    chip.querySelector(".lbl").textContent = state.client;
  } else chip.classList.remove("show");
  const bits = [];
  if(late) bits.push(`<b>${late}</b> en retard`);
  if(p0) bits.push(`<b>${p0}</b> en priorité absolue`);
  bits.push(`<b>${active.length}</b> projets actifs`);
  $("#mast-sub").innerHTML = state.client
    ? `Focus <b>${esc(state.client)}</b> — ${bits.join(" · ")}.`
    : `${bits.join(" · ")}. Le reste du portefeuille est bouclé.`;
}

function statCard(v, l, cls, pct, jump){
  // jump = clé de drill-down (montre les tâches concernées). Carte cliquable si fourni.
  const j = jump ? ` data-jump="${jump}" role="button" tabindex="0" title="Voir les tâches concernées" style="cursor:pointer"` : "";
  return `<div class="stat ${cls||''}"${j}><div class="sv">${v}${pct?`<span class="spct">${pct}</span>`:''}</div><div class="sl">${esc(l)}</div></div>`;
}
function renderStats(scope, active){
  const late = active.filter(isLate).length;
  const wait = scope.filter(m=>m.statut==="En attente client" && !isTraite(m.ndeg)).length;
  const block = scope.filter(m=>m.statut==="Bloqué" && !isTraite(m.ndeg)).length;
  const closed = scope.filter(m=>CLOSED_STATUS.has(m.statut)).length;
  const rate = scope.length ? Math.round(closed/scope.length*100) : 0;
  $("#statstrip").innerHTML =
    statCard(active.length, "Projets actifs", null, null, "all") +
    statCard(late, "Échéances dépassées", "alert", null, "late") +
    statCard(active.filter(m=>m.prio==="P0").length, "Priorité P0", "warn", null, "p0") +
    statCard(block+wait, "Bloqués / attente client", null, null, "blocked") +
    statCard(rate, "Taux de traitement", "go", "%");
}
// surligne brièvement une carte vers laquelle on saute (affordance « les voici »)
function flashCard(el){ if(!el) return;
  el.scrollIntoView({behavior:"smooth", block:"center"});
  el.style.transition="box-shadow .2s"; el.style.boxShadow="0 0 0 3px var(--orange-400,#FF8A3D)";
  setTimeout(()=>{ el.style.boxShadow=""; }, 1300);
}

// ---- radar queue (dark) ----
function renderQueue(active){
  const counts = {
    all: active.length,
    late: active.filter(isLate).length,
    p0: active.filter(m=>m.prio==="P0").length,
    wait: active.filter(m=>m.statut==="En attente client").length
  };
  const seg = $("#queue-seg");
  seg.querySelectorAll("button").forEach(b=>{
    b.classList.toggle("active", b.dataset.seg===state.seg);
    b.querySelector(".n").textContent = counts[b.dataset.seg];
  });
  let list = active.slice();
  if(state.seg==="late") list = list.filter(isLate);
  else if(state.seg==="p0") list = list.filter(m=>m.prio==="P0");
  else if(state.seg==="wait") list = list.filter(m=>m.statut==="En attente client");
  list.sort((a,b)=>{
    const ua=urgency(a), ub=urgency(b);
    if(ua.rank!==ub.rank) return ua.rank-ub.rank;
    if(isLate(a)&&isLate(b)) return new Date(a.deadline)-new Date(b.deadline);
    return a.ndeg.localeCompare(b.ndeg,undefined,{numeric:true});
  });
  const wrap = $("#queue-list");
  if(!list.length){ wrap.innerHTML = `<div class="empty-mini" style="color:var(--fg-on-dark-2)">Rien dans cette file. ✓</div>`; return; }
  wrap.innerHTML = list.map(m=>{
    const u = urgency(m);
    const tags = [];
    if(u.tag!=="normal") tags.push(`<span class="urg-tag ${URG_CLS[u.tag]}">${URG_LABEL[u.tag]}</span>`);
    if(isLate(m) && m.prio==="P0") tags.push(`<span class="urg-tag urg-p0">P0</span>`);
    // titre en tête, méta ensuite ; le code dossier ferme la ligne, discret
    const who = esc(m.marque || m.client || "");
    const dl = isLate(m) ? `<span style="color:var(--orange-300);flex:0 0 auto">en retard de ${daysLate(m)}j</span>` : "";
    return `<div class="qrow${isTraite(m.ndeg)?' done':''}" data-nd="${esc(m.ndeg)}">
      <div class="qleft">
        <span class="cdot" style="background:${clientCol(m.client)}"></span>
        <div class="qmeta">
          <div class="qt">${esc(m.projet)}</div>
          <div class="qn"><span>${who}</span>${dl?`<span style="opacity:.6">·</span>${dl}`:""}<span class="qcode">${esc(m.ndeg)}</span></div>
        </div>
      </div>
      <div class="qright">${tags.join("")}
        <button class="qcheck" data-check="${esc(m.ndeg)}" title="Marquer traité"><i data-lucide="check" style="width:14px;height:14px"></i></button>
      </div>
    </div>`;
  }).join("");
}

// ---- ring ----
function renderRing(scope){
  const closed = scope.filter(m=>CLOSED_STATUS.has(m.statut)).length;
  const total = scope.length || 1;
  const pct = Math.round(closed/total*100);
  const active = scope.filter(m=>!effDone(m)&&!isFrozen(m)).length;
  const R=84, C=2*Math.PI*R, off=C*(1-pct/100);
  $("#ringcard").querySelector(".ring-wrap").innerHTML = `
    <div class="ring">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--surface-sunk)" stroke-width="18"/>
        <circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--orange-500)" stroke-width="18" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1s var(--ease-out)" data-ring/>
      </svg>
      <div class="ring-center"><div class="rv">${pct}%</div><div class="rl">traité</div></div>
    </div>
    <div class="ring-legend">
      <div class="li"><span class="sw" style="background:var(--orange-500)"></span><b>${closed}</b>&nbsp;bouclés</div>
      <div class="li"><span class="sw" style="background:var(--surface-sunk);box-shadow:inset 0 0 0 1px var(--border)"></span><b>${active}</b>&nbsp;en cours</div>
    </div>`;
  requestAnimationFrame(()=>{ const c=$("#ringcard").querySelector("[data-ring]"); if(c) c.style.strokeDashoffset=off; });
}

// ---- échéances ----
function renderEch(active){
  const late = active.filter(isLate).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const body = $("#echcard .ech-body");
  if(!late.length){ body.innerHTML = `<div class="ech-big"><span class="n" style="color:var(--success)">0</span><span class="u">échéance<br>dépassée</span></div><div class="ech-sub">Aucun retard dans ce périmètre.</div>`; return; }
  body.innerHTML = `
    <div class="ech-big"><span class="n">${late.length}</span><span class="u">échéance${late.length>1?'s':''}<br>dépassée${late.length>1?'s':''}</span></div>
    <div class="ech-sub">Les plus anciennes d'abord</div>
    <div class="ech-list">${late.slice(0,5).map(m=>`
      <div class="ech-row" data-nd="${esc(m.ndeg)}">
        <span class="cdot" style="background:${clientCol(m.client)}"></span>
        <span class="et">${esc(m.projet)}</span>
        <span class="ed">+${daysLate(m)}j</span>
      </div>`).join("")}</div>`;
}

// ---- clients ----
function renderClients(scope){
  const head = $("#clientscard .card-head h3");
  const body = $("#clientscard .cl-list");
  let groups, keyFn, labelFn, colorFn, isMarque=false;
  if(state.client){
    head.textContent = "Charge par marque";
    isMarque = true;
    keyFn = m=>m.marque||"(sans marque)";
    colorFn = ()=>clientCol(state.client);
  } else {
    head.textContent = "Charge par client";
    keyFn = m=>m.client;
    colorFn = k=>clientCol(k);
  }
  const map = {};
  scope.filter(m=>!effDone(m)&&!isFrozen(m)).forEach(m=>{
    const k = keyFn(m);
    (map[k]=map[k]||[]).push(m);
  });
  let rows = Object.entries(map).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
  if(!rows.length){ body.innerHTML = `<div class="empty-mini">Aucun projet actif ici.</div>`; return; }
  const max = rows[0][1].length;
  body.innerHTML = rows.map(([k,arr])=>{
    const lateN = arr.filter(isLate).length;
    // status stack
    const byStatut = {};
    arr.forEach(m=>{ byStatut[m.statut]=(byStatut[m.statut]||0)+1; });
    const segs = ACTIVE_STATUSES.filter(s=>byStatut[s]).map(s=>
      `<span class="cl-seg" style="width:${byStatut[s]/max*100}%;background:${STATUT_COL[s]}" title="${esc(s)}: ${byStatut[s]}"></span>`).join("");
    const dataAttr = isMarque ? `data-marque="${esc(k)}"` : `data-client="${esc(k)}"`;
    return `<div class="cl-row" ${dataAttr}>
      <span class="cl-name"><span class="cdot" style="background:${colorFn(k)}"></span>${esc(k)}</span>
      <span class="cl-track">${segs}</span>
      <span class="cl-count">${arr.length}${lateN?` <span class="cl-late">${lateN} ⏱</span>`:''}</span>
    </div>`;
  }).join("");
}

// ---- pipeline ----
function renderPipe(scope){
  const order = ["En cours","En attente client","Reçu","Bloqué","Livré","Bouclé"];
  const counts = {};
  scope.forEach(m=>{ let s=m.statut; if(s==="Validé"||s==="Livré (cycle)")s="Livré"; if(s==="Archivé")return; counts[s]=(counts[s]||0)+1; });
  const total = Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const bar = order.filter(s=>counts[s]).map(s=>
    `<span class="pipe-seg" style="width:${counts[s]/total*100}%;background:${STATUT_COL[s]}" title="${esc(s)}"></span>`).join("");
  const legend = order.filter(s=>counts[s]).map(s=>
    `<div class="pipe-li" data-statut="${esc(s)}"><span class="sw" style="background:${STATUT_COL[s]}"></span><span class="pl">${esc(s)}</span><span class="pn">${counts[s]}</span></div>`).join("");
  $("#pipecard .pipe-body").innerHTML = `<div class="pipe-bar">${bar}</div><div class="pipe-legend">${legend}</div>`;
}

// ---- blocked / waiting ----
function renderBlocked(active){
  const items = active.filter(m=>m.statut==="Bloqué"||m.statut==="En attente client")
    .sort((a,b)=>(a.statut==="Bloqué"?0:1)-(b.statut==="Bloqué"?0:1));
  const body = $("#blockedcard .bl-list");
  if(!items.length){ body.innerHTML = `<div class="empty-mini">Rien de bloqué. Le flux est dégagé.</div>`; return; }
  body.innerHTML = items.map(m=>{
    const t = m.statut==="Bloqué" ? `<span class="bl-tag t-block">Bloqué</span>` : `<span class="bl-tag t-wait">Attente client</span>`;
    return `<div class="bl-row" data-nd="${esc(m.ndeg)}">
      <span class="cdot" style="background:${clientCol(m.client)}"></span>
      <div class="bi"><div class="bt">${esc(m.projet)}</div><div class="bn">${esc(m.ndeg)} · ${esc(m.marque||m.client)}</div></div>
      ${t}
    </div>`;
  }).join("");
}

// ---- team load ----
function renderTeam(scope){
  const map = {};
  scope.filter(m=>!effDone(m)&&!isFrozen(m)).forEach(m=>{
    const r = normResp(m.responsable);
    if(!r || /réunion|stand by|à programmer/i.test(r)) return;
    // split combined owners
    r.split(/\s*[\/&;]\s*|\s+et\s+/).map(x=>x.trim()).filter(Boolean).forEach(name=>{
      map[name]=(map[name]||0)+1;
    });
  });
  let rows = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const body = $("#teamcard .team-body");
  if(!rows.length){ body.innerHTML = `<div class="empty-mini">Pas de responsable assigné dans ce périmètre.</div>`; return; }
  const max = rows[0][1];
  body.innerHTML = `<div class="team-bars">${rows.map(([n,v],i)=>`
    <div class="tb${i===0?' top':''}">
      <div class="tcol" style="height:${Math.max(8,v/max*100)}%"><span class="tval">${v}</span></div>
      <span class="tname">${esc(n)}</span>
    </div>`).join("")}</div>`;
}

// clôture rapide depuis la file (persistée en base, optimiste)
async function quickClose(nd, btn){
  const m = MASTERS.find(x=>x.ndeg===nd);
  if(m && m.id && window.isLive && isLive()){
    const prev = {statut:m.statut, closedAt:m.closedAt};
    m.statut = STATUT_CLOTURE; m.closedAt = todayISO();   // optimiste : sort de la file active
    render();
    try{ await closeTask(m.id, m.ndeg); }
    catch(e){ m.statut=prev.statut; m.closedAt=prev.closedAt; render(); flash("Échec — clôture non enregistrée en base","err"); }
  } else {
    // mode hors-ligne (CSV) ou sans id : triage local, non persistant
    setTraite(nd, !isTraite(nd)); render();
    flash("Hors-ligne : coche locale, non enregistrée en base","warn");
  }
}

// =================== EVENTS ===================
function bind(){
  // delegated clicks
  document.addEventListener("click", e=>{
    // stat strip → drill-down vers les tâches concernées
    const jp = e.target.closest("[data-jump]");
    if(jp){ const j=jp.dataset.jump;
      if(j==="blocked"){ flashCard($("#blockedcard")); return; }
      state.seg=j; state.client=""; render();
      flashCard($("#radarcard")); return;
    }
    const check = e.target.closest("[data-check]");
    if(check){ e.stopPropagation(); quickClose(check.dataset.check, check); return; }
    const ndEl = e.target.closest("[data-nd]");
    if(ndEl){ location.href="tache.html?code="+encodeURIComponent(ndEl.dataset.nd); return; }
    const clEl = e.target.closest("[data-client]");
    if(clEl){ state.client = clEl.dataset.client; state.seg="all"; render(); return; }
    const stEl = e.target.closest("[data-statut]");
    if(stEl){ /* pipeline legend → could filter; keep as no-op highlight */ }
  });
  // scope nav (decorative scopes => set view)
  $("#queue-seg").addEventListener("click", e=>{
    const b = e.target.closest("button"); if(!b) return;
    state.seg = b.dataset.seg; renderQueue(scopeMasters().filter(m=>!effDone(m)));
    if(window.lucide) window.lucide.createIcons();
  });
  $("#search").addEventListener("input", e=>{ state.q = e.target.value; render(); });
  $("#filterchip").querySelector("button").addEventListener("click", ()=>{ state.client=""; render(); });
  // top scope tabs
  document.querySelectorAll(".nav-scope button").forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll(".nav-scope button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      const v=b.dataset.view;
      if(v==="all"){ state.client=""; state.seg="all"; }
      else if(v==="late"){ state.client=""; state.seg="late"; }
      else if(v==="p0"){ state.client=""; state.seg="p0"; }
      else if(v==="wait"){ state.client=""; state.seg="wait"; }
      render();
      $(".c-radar").scrollIntoView ? null : null;
    });
  });
}

// ---- chargement live depuis INDEX.csv (source de vérité du tracker) ----
function parseCSV(text){
  text=text.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const rows=[]; let i=0,f="",row=[],q=false;
  while(i<text.length){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i+=2;continue;} q=false;i++;continue;} f+=c;i++;continue; }
    if(c==='"'){q=true;i++;continue;}
    if(c===','){row.push(f);f="";i++;continue;}
    if(c==='\n'){row.push(f);rows.push(row);row=[];f="";i++;continue;}
    f+=c;i++;
  }
  if(f.length||row.length){row.push(f);rows.push(row);}
  return rows;
}
function csvToBriefs(text){
  const rows=parseCSV(text); if(!rows.length) return [];
  const head=rows[0].map(h=>h.trim()); const ix=n=>head.indexOf(n);
  const M={ndeg:ix("N°"),client:ix("Client"),marque:ix("Marque"),cluster:ix("Cluster"),pays:ix("Pays"),
    projet:ix("Projet"),niveau:ix("Niveau"),type:ix("Type"),statut:ix("Statut"),prio:ix("Priorité"),
    avancement:ix("Avancement"),deadline:ix("Deadline"),responsable:ix("Responsable"),livrables:ix("Livrables"),
    date:ix("Date réception"),entree:ix("Type entrée"),parent:ix("Rattaché à"),comm:ix("Commentaires")};
  const g=(c,j)=>(j>=0&&j<c.length?(c[j]||"").trim():""); const out=[];
  for(let i=1;i<rows.length;i++){ const c=rows[i]; if(!c||g(c,M.ndeg)==="") continue;
    out.push({ndeg:g(c,M.ndeg),client:g(c,M.client),marque:g(c,M.marque),cluster:g(c,M.cluster),pays:g(c,M.pays),
      projet:g(c,M.projet),niveau:g(c,M.niveau),type:g(c,M.type),statut:g(c,M.statut),prio:g(c,M.prio),
      avancement:g(c,M.avancement),deadline:g(c,M.deadline),responsable:g(c,M.responsable),livrables:g(c,M.livrables),
      date:g(c,M.date),entree:g(c,M.entree),parent:g(c,M.parent),comm:g(c,M.comm)}); }
  return out;
}
async function boot(){
  try{ window.BRIEFS = await loadBriefsLive(); }catch(e){ window.BRIEFS = window.BRIEFS||[]; }
  MASTERS = (window.BRIEFS||[]).filter(m=>m.entree==="Maître");
  try{ const kk=document.querySelector(".masthead .kick");
    if(kk){ const d=TODAY.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
      kk.textContent = d.charAt(0).toUpperCase()+d.slice(1)+" · radar matinal"; } }catch(e){}
  bind(); render();
  if(window.sourceBanner) sourceBanner();   // bandeau si données non-live
}
document.addEventListener("DOMContentLoaded", boot);
