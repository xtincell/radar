"use strict";
/* ============================================================
   Radar — chrome partagé (chrome.js)
   UNE seule barre de navigation pour tout le système : marque,
   liens (ordre + état actif identiques partout), chip identité,
   toggle de thème clair/sombre. Tue la racine du problème des
   « 4 menus différents ».
   - Si la page contient <div id="mtg-top" data-page="KEY" data-sub="…">,
     on y monte la barre complète.
   - Sinon, on injecte au minimum le toggle de thème (flottant) pour
     que le thème reste global, même sur une page pas encore migrée.
   Chargé APRÈS supa.js + ui.js, AVANT le script de page.
   ============================================================ */
(function(){

/* ---- thème : clair par défaut, sombre opt-in, persistant ---- */
const THEME_KEY = "radar:theme";
function getTheme(){ try{ return localStorage.getItem(THEME_KEY)==="dark" ? "dark" : "light"; }catch(e){ return "light"; } }
function applyTheme(t){
  if(t==="dark") document.documentElement.setAttribute("data-theme","dark");
  else document.documentElement.removeAttribute("data-theme");
}
function setTheme(t){ try{ localStorage.setItem(THEME_KEY, t); }catch(e){} applyTheme(t); paintThemeBtns(); }
function toggleTheme(){ setTheme(getTheme()==="dark" ? "light" : "dark"); }
applyTheme(getTheme());                 // appliqué le plus tôt possible
window.MTG_toggleTheme = toggleTheme;
window.MTG_getTheme = getTheme;

/* ---- modèle de navigation (source unique de vérité) ---- */
/* 7 destinations. « Entrées » vit désormais dans Projets (vue chrono) et
   « Équipe » dans Rapport (par responsable) — accessibles via un lien depuis
   ces pages, plus dans la nav principale pour réduire le bruit. */
const NAV = [
  {key:"radar",     label:"Aujourd'hui", href:"radar.html",     icon:"radar"},
  {key:"direction", label:"Direction",   href:"direction.html", icon:"compass"},
  {key:"dashboard", label:"Projets",     href:"dashboard.html", icon:"layout-grid"},
  {key:"wiki",      label:"Wiki",        href:"wiki.html",      icon:"book-open"},
  {key:"marques",   label:"Marques",     href:"marques.html",   icon:"library"},
  {key:"valider",   label:"À valider",   href:"valider.html",   icon:"badge-check"},
  {key:"todo",      label:"À faire",     href:"todo.html",      icon:"check-square"},
  {key:"bilan",     label:"Bilan",       href:"bilan.html",     icon:"calendar-check"},
  {key:"faits",     label:"Faits",       href:"faits.html",     icon:"check-check"},
  {key:"rapport",   label:"Rapport",     href:"rapport.html",   icon:"bar-chart-3"},
  {key:"sla",       label:"SLA",         href:"sla.html",       icon:"gauge"},
  {key:"gantt",     label:"Planning",    href:"gantt.html",     icon:"calendar-range"},
  {key:"archive",   label:"Historique",  href:"archive.html",   icon:"archive"},
  {key:"gel",       label:"Gelés",       href:"gel.html",       icon:"snowflake"},
  {key:"gabarits",   label:"Présentation",href:"gabarits.html",                  icon:"presentation"},
  {key:"ticket",     label:"Ticket",      href:"ticket.html",                    icon:"plus"},
  {key:"equipe",     label:"Équipe",      href:"equipe.html",                    icon:"users"},
  {key:"evaluation", label:"Éval",        href:"rh/evaluation-departement.html", icon:"user-check"},
  {key:"entrees",    label:"Entrées",     href:"entrees.html",                   icon:"list"},
];
const NAV_SECONDARY = [];
const NAV_PRIMARY   = ["radar","direction","todo","dashboard","valider","bilan"];
const NAV_MORE_KEYS = ["equipe","evaluation","rapport","faits","gantt","sla","wiki","marques","archive","gel","gabarits"];
const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const initial = s => ((s||"").trim().charAt(0).toUpperCase() || "?");

/* ---- styles injectés une fois (tout en tokens → suit le thème) ---- */
function injectStyles(){
  if(document.getElementById("mtg-chrome-styles")) return;
  const css = `
  /* Couleur du statut « Frozen » (gelé) — injectée globalement pour toutes les pages,
     qu'elles définissent leurs --st-* en ligne ou via radar.css. */
  :root{--st-frozen:#6FA1B8;--st-slack:#7A2E86}
  :root[data-theme="dark"]{--st-frozen:#5E8FA8;--st-slack:#A877B5}
  .mtg-bar{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);
    border-radius:var(--radius-pill);padding:9px 11px 9px 15px;box-shadow:var(--shadow-md);
    position:sticky;top:14px;z-index:50;margin:0 0 4px}
  .mtg-brand{display:flex;align-items:center;gap:12px;flex:0 0 auto;text-decoration:none}
  .mtg-logo-svg{display:block;height:40px;width:120px;flex:0 0 auto}
  .mtg-logo-svg text{font-family:var(--font-display),"Familjen Grotesk",system-ui,sans-serif}
  .mtg-logo-svg .l1-2{fill:var(--fg1);font-weight:900}
  .mtg-logo-svg .l3{fill:var(--orange-500);font-weight:900}
  .mtg-sub{font-size:11.5px;color:var(--fg3);border-left:1px solid var(--border);padding-left:10px;margin-left:2px}
  .mtg-nav{display:flex;gap:2px;align-items:center;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
  .mtg-nav::-webkit-scrollbar{display:none}
  .mtg-nav a{display:inline-flex;align-items:center;gap:7px;text-decoration:none;color:var(--fg2);
    font-family:var(--font-sans);font-size:13.5px;font-weight:600;padding:9px 13px;border-radius:var(--radius-pill);
    transition:background .13s,color .13s;white-space:nowrap}
  .mtg-nav a:hover{background:var(--paper-100);color:var(--fg1)}
  .mtg-nav a.active{background:var(--ink-950);color:#F7F2EA}
  .mtg-right{display:flex;gap:8px;align-items:center;flex:0 0 auto}
  .mtg-theme,.mtg-id{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);background:var(--surface);
    color:var(--fg2);font:inherit;font-family:var(--font-sans);font-size:12.5px;font-weight:600;cursor:pointer;
    padding:7px 12px;border-radius:var(--radius-pill);transition:.13s;white-space:nowrap}
  .mtg-theme:hover,.mtg-id:hover{border-color:var(--orange-400);color:var(--orange-600)}
  .mtg-id .av{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;
    background:var(--orange-500);color:#fff;font-size:10.5px;font-weight:800;flex:0 0 auto}
  .mtg-id.guest .av{background:var(--ink-700)}
  .mtg-menu{position:absolute;z-index:120;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);
    box-shadow:var(--shadow-lg);padding:7px;min-width:210px;max-height:60vh;overflow:auto}
  .mtg-menu .hd{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg3);padding:6px 9px 4px}
  .mtg-menu button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:transparent;
    color:var(--fg1);font:inherit;font-size:13.5px;font-weight:600;padding:8px 9px;border-radius:var(--radius-sm);cursor:pointer}
  .mtg-menu button:hover{background:var(--paper-100)}
  .mtg-menu button.sel{color:var(--orange-600)}
  .mtg-menu .av{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
    background:var(--ink-800);color:#fff;font-size:10.5px;font-weight:800;flex:0 0 auto}
  .mtg-fab{position:fixed;right:16px;bottom:16px;z-index:9000}
  /* HUD rééquilibré : thème en icône seule, Ticket en action accent, menu « Plus » */
  .mtg-theme .lbl{display:none}
  .mtg-theme{padding:8px 10px}
  .mtg-ticket{display:inline-flex;align-items:center;gap:7px;text-decoration:none;background:var(--orange-500);color:#fff;
    font-family:var(--font-sans);font-size:13px;font-weight:700;padding:8px 14px;border-radius:var(--radius-pill);transition:.13s;white-space:nowrap;flex:0 0 auto}
  .mtg-ticket:hover{background:var(--orange-600)}
  .mtg-ticket.active{box-shadow:0 0 0 2px color-mix(in srgb,var(--orange-500) 35%,transparent)}
  .mtg-more{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--fg2);font:inherit;
    font-family:var(--font-sans);font-size:13.5px;font-weight:600;padding:9px 12px;border-radius:var(--radius-pill);cursor:pointer;white-space:nowrap;flex:0 0 auto}
  .mtg-more:hover{background:var(--paper-100);color:var(--fg1)}
  .mtg-more.active{background:var(--paper-100);color:var(--orange-600)}
  .mtg-more-menu{position:fixed;z-index:130;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);
    box-shadow:var(--shadow-lg);padding:7px;min-width:212px;display:flex;flex-direction:column;gap:1px}
  .mtg-more-menu[hidden]{display:none}
  .mtg-more-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;
    color:var(--fg1);font:inherit;font-size:13.5px;font-weight:600;padding:9px 10px;border-radius:var(--radius-sm);cursor:pointer}
  .mtg-more-menu button:hover{background:var(--paper-100)}
  .mtg-more-menu button.sel{color:var(--orange-600)}
  .mtg-more-menu .ic{display:inline-flex;width:18px;justify-content:center;color:var(--fg3);flex:0 0 auto}
  .mtg-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between;
    max-width:1180px;margin:42px auto 18px;padding:14px 16px;border-top:1px solid var(--border);
    font-size:12px;color:var(--fg3)}
  .mtg-foot .brand{font-weight:600;color:var(--fg2)}
  .mtg-foot .feeds{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .mtg-foot .feeds .lbl{color:var(--fg3);margin-right:2px}
  .mtg-foot a{display:inline-flex;align-items:center;gap:5px;text-decoration:none;color:var(--fg2);
    border:1px solid var(--border);border-radius:var(--radius-pill);padding:4px 11px;transition:.13s}
  .mtg-foot a:hover{border-color:var(--orange-400);color:var(--orange-600)}
  .mtg-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;
    border:1px solid var(--border);background:var(--surface);color:var(--fg2);border-radius:var(--radius-pill);cursor:pointer;transition:.13s;flex:0 0 auto}
  .mtg-bell:hover{border-color:var(--orange-400);color:var(--orange-600)}
  .mtg-bell .badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;
    background:var(--orange-500);color:#fff;font-family:var(--font-mono);font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px var(--surface)}
  .mtg-notif{min-width:300px;max-width:360px}
  .mtg-notif .it{display:flex;gap:9px;padding:9px;border-radius:var(--radius-sm);cursor:pointer;text-align:left;width:100%;border:0;background:transparent;font:inherit}
  .mtg-notif .it:hover{background:var(--paper-100)}
  .mtg-notif .it.unseen{background:color-mix(in srgb,var(--orange-500) 9%,transparent)}
  .mtg-notif .it .em{font-size:15px;flex:0 0 auto;line-height:1.3}
  .mtg-notif .it .tx{min-width:0;display:flex;flex-direction:column}
  .mtg-notif .it .tt{font-size:12.5px;font-weight:600;color:var(--fg1);line-height:1.25;white-space:normal}
  .mtg-notif .it .mt{font-size:11px;color:var(--fg3);margin-top:1px;white-space:normal}
  @media (max-width:760px){
    .mtg-logo-svg{height:36px;width:108px}
    .mtg-sub{display:none}
    .mtg-bar{flex-wrap:wrap;gap:8px;padding:8px 9px 8px 11px;top:8px}
    /* flex-basis:100% obligatoire : le flex:1 de base (basis 0) empêchait le
       passage à la ligne → la nav entière était écrasée en une bande de ~35px. */
    .mtg-nav{order:5;flex-basis:100%;width:100%;gap:1px;-webkit-overflow-scrolling:touch}
    .mtg-nav a{padding:8px 11px;font-size:13px}
    .mtg-ticket .lbl{display:none}              /* Ticket = icône seule sur mobile */
    .mtg-ticket{padding:8px 11px}
    .mtg-id .lbl{max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mtg-more-menu{position:fixed;left:8px!important;right:8px;width:auto;min-width:0}
  }
  @media (max-width:420px){ .mtg-id .lbl{display:none} .mtg-id{padding:7px 9px} }
  `;
  const st=document.createElement("style"); st.id="mtg-chrome-styles"; st.textContent=css; document.head.appendChild(st);
}

function themeBtnHTML(){
  const dark = getTheme()==="dark";
  const icon = dark ? "sun-medium" : "moon";
  const lbl = dark ? "Clair" : "Sombre";
  return `<button class="mtg-theme" id="mtg-theme" type="button" title="Basculer le thème" aria-label="Basculer en mode ${esc(lbl).toLowerCase()}">
    <i data-lucide="${icon}" style="width:15px;height:15px"></i><span class="lbl">${esc(lbl)}</span></button>`;
}
function paintThemeBtns(){
  document.querySelectorAll(".mtg-theme").forEach(b=>{
    const dark=getTheme()==="dark";
    b.querySelector(".lbl") && (b.querySelector(".lbl").textContent = dark?"Clair":"Sombre");
    const ic=b.querySelector("i"); if(ic){ ic.setAttribute("data-lucide", dark?"sun-medium":"moon"); }
  });
  if(window.lucide) window.lucide.createIcons();
}

/* Identité authentifiée (niveau d'autorité), chargée depuis /profil via supa.js.
   null tant que non chargée → on retombe sur l'ancien comportement « voir comme ». */
let IDENT = null;
const ROLE_LBL = {owner:"accès total", supervisor:"toutes les tâches", member:"mes tâches"};
function isOwner(){ return !IDENT || IDENT.role==="owner"; }

function whoLabel(){ const me=(window.getMe&&getMe())||""; return me==="*"?"Manager":me||""; }
function idChipHTML(){
  // Compte non-owner : on affiche l'identité réelle (pas de « voir comme »).
  if(IDENT && IDENT.role!=="owner"){
    const nm = IDENT.person || IDENT.email || "Mon compte";
    return `<button class="mtg-id" id="mtg-id" type="button" title="Mon compte (${esc(ROLE_LBL[IDENT.role]||IDENT.role)})">
      <span class="av">${esc(initial(nm))}</span><span class="lbl">${esc(nm)}</span></button>`;
  }
  const me=(window.getMe&&getMe())||"";
  const guest = !me;
  const label = me==="*" ? "Manager" : me || "Qui es-tu ?";
  const av = me==="*" ? "★" : me ? initial(me) : "?";
  return `<button class="mtg-id${guest?' guest':''}" id="mtg-id" type="button" title="Voir le pipe sous l'angle d'une personne">
    <span class="av">${esc(av)}</span><span class="lbl">${esc(label)}</span></button>`;
}
function applyIdent(id){
  IDENT = id || null; window.MTG_IDENTITY = IDENT;
  const chip=document.getElementById("mtg-id");
  if(chip && chip.parentElement){ chip.outerHTML = idChipHTML(); wire(); if(window.lucide) window.lucide.createIcons(); }
  applyGreet();
  // Lien « Évaluations RH » : injecté dans le menu Plus, owner uniquement (gate serveur /rh/*).
  const mm=document.getElementById("mtg-more-menu");
  if(mm && IDENT && IDENT.role==="owner" && !mm.querySelector("[data-key='rh']")){
    const btn=document.createElement("button");
    btn.dataset.goto="rh/evaluation-departement.html"; btn.dataset.key="rh";
    btn.style.cssText="border-top:1px solid var(--border);margin-top:4px;padding-top:8px";
    btn.innerHTML=`<span class="ic"><i data-lucide="file-badge-2" style="width:15px;height:15px"></i></span>Évaluations RH`;
    mm.appendChild(btn);
    if(window.lucide) window.lucide.createIcons();
  }
}
/* Salutation dynamique « Bonjour, <prénom> » (élément #greet, ex. radar.html).
   Reflète l'utilisateur authentifié ; pour l'owner en mode « voir comme », suit la
   personne regardée. Prénom = 1er mot du nom (« William K. Mandengue » → « William »). */
function applyGreet(){
  const el=document.getElementById("greet"); if(!el) return;
  const me=(window.getMe&&getMe())||"";
  const name = (IDENT && IDENT.role && IDENT.role!=="owner")
    ? (IDENT.person||"")
    : (me && me!=="*" ? me : (IDENT ? (IDENT.person||"") : ""));
  const first=(name||"").trim().split(/\s+/)[0]||"";
  el.innerHTML = first ? `Bonjour, <em>${esc(first)}</em>` : `Bonjour <em>👋</em>`;
}

function openIdMenu(anchor){
  closeMenus();
  const me=(window.getMe&&getMe())||"";
  const team=(window.TEAM_BASE||[]).slice().sort((a,b)=>a.localeCompare(b,"fr"));
  const menu=document.createElement("div"); menu.className="mtg-menu"; menu.id="mtg-id-menu";
  // « Voir le pipe comme » réservé au owner (accès total). Les autres ont une vue
  // déjà restreinte par leur niveau d'autorité → on n'affiche que leur identité.
  const viewAs = isOwner()
    ? `<div class="hd">Voir le pipe comme</div>
       <button data-me="*" class="${me==='*'?'sel':''}"><span class="av">★</span>Manager — tout</button>
       ${team.map(n=>`<button data-me="${esc(n)}" class="${me===n?'sel':''}"><span class="av">${esc(initial(n))}</span>${esc(n)}</button>`).join("")}
       <button data-me="" class="${me===''?'sel':''}"><span class="av">?</span>Personne (réinit.)</button>`
    : `<div class="hd">Connecté·e</div>
       <button disabled style="cursor:default;opacity:1"><span class="av">${esc(initial(IDENT.person||IDENT.email||"?"))}</span>${esc(IDENT.person||IDENT.email||"")} — ${esc(ROLE_LBL[IDENT.role]||IDENT.role)}</button>`;
  // page d'accueil : préférence perso (radar:landing) — défaut « selon mon rôle »
  let landing=""; try{ landing=localStorage.getItem("radar:landing")||""; }catch(e){}
  const LANDINGS=[["","Selon mon rôle"],["direction.html","Direction"],["radar.html","Aujourd'hui"],["todo.html","À faire"]];
  menu.innerHTML=`${viewAs}
    <div class="hd" style="border-top:1px solid var(--border);margin-top:6px;padding-top:8px">Ma page d'accueil</div>
    ${LANDINGS.map(([v,l])=>`<button data-landing="${v}" class="${landing===v?'sel':''}"><span class="av">${v?"⌂":"✦"}</span>${l}</button>`).join("")}
    <div class="hd" style="border-top:1px solid var(--border);margin-top:6px;padding-top:8px">Mon compte</div>
    <button data-goto="profil.html"><span class="av">🔑</span>Mon mot de passe</button>
    <button data-goto="/logout"><span class="av">⎋</span>Se déconnecter</button>`;
  document.body.appendChild(menu);
  const r=anchor.getBoundingClientRect();
  menu.style.top=(window.scrollY+r.bottom+6)+"px";
  menu.style.right=Math.max(8,(window.innerWidth-r.right))+"px";
  menu.addEventListener("click",e=>{
    const g=e.target.closest("[data-goto]"); if(g){ location.href=g.getAttribute("data-goto"); return; }
    const L=e.target.closest("[data-landing]");
    if(L){ try{ const v=L.getAttribute("data-landing");
      if(v) localStorage.setItem("radar:landing",v); else localStorage.removeItem("radar:landing");
    }catch(err){} closeMenus(); return; }
    const b=e.target.closest("[data-me]"); if(!b) return;
    const v=b.getAttribute("data-me"); if(window.setMe) setMe(v); location.reload(); });
}
function closeMenus(){ document.querySelectorAll(".mtg-menu").forEach(m=>m.remove()); }

function currentKey(){
  const f=(location.pathname.split("/").pop()||"").toLowerCase();
  const hit=NAV.find(n=>n.href===f); if(hit) return hit.key;
  if(f===""||f==="index.html") return "radar";
  if(f==="tache.html") return "";   // détail : aucun onglet actif
  return "";
}

function mountBar(host){
  injectStyles();
  const page = host.getAttribute("data-page") || currentKey();
  const sub  = host.getAttribute("data-sub") || "";
  const byKey = k => NAV.find(n=>n.key===k);
  const primary = NAV_PRIMARY.map(byKey).filter(Boolean);
  const moreItems = NAV_MORE_KEYS.map(byKey).filter(Boolean).concat(NAV_SECONDARY);
  const ticket = byKey("ticket");
  const inMore = moreItems.some(n=>n.key===page);
  const links = primary.map(n=>`<a href="${n.href}" class="${n.key===page?'active':''}" title="${esc(n.label)}">
      <i data-lucide="${n.icon}" style="width:16px;height:16px"></i>${esc(n.label)}</a>`).join("");
  const moreLinks = moreItems.map(n=>`<button data-goto="${n.href}" class="${n.key===page?'sel':''}">
      <span class="ic"><i data-lucide="${n.icon||'circle'}" style="width:15px;height:15px"></i></span>${esc(n.label)}</button>`).join("");
  host.innerHTML = `<header class="mtg-bar">
    <a class="mtg-brand" href="radar.html">
      <svg class="mtg-logo-svg" viewBox="0 0 120 40" width="120" height="40" aria-label="RADAR">
        <text x="0" y="18" font-size="14" font-weight="900" textLength="120" lengthAdjust="spacing" class="l1-2">LE</text>
        <text x="0" y="36" font-size="16" font-weight="900" textLength="120" lengthAdjust="spacing" class="l3">RADAR</text>
      </svg>
      ${sub ? `<span class="mtg-sub">${esc(sub)}</span>` : ""}
    </a>
    <nav class="mtg-nav" aria-label="Navigation principale">${links}
      <button class="mtg-more${inMore?' active':''}" id="mtg-more" type="button" aria-haspopup="true" title="Plus de vues">Plus<i data-lucide="chevron-down" style="width:14px;height:14px"></i></button>
    </nav>
    <div class="mtg-right">
      ${ticket?`<a class="mtg-ticket${page==='ticket'?' active':''}" href="${ticket.href}" title="Nouveau ticket"><i data-lucide="plus" style="width:16px;height:16px"></i><span class="lbl">Ticket</span></a>`:""}
      ${bellBtnHTML()}${idChipHTML()}${themeBtnHTML()}
    </div>
  </header>
  <div class="mtg-more-menu" id="mtg-more-menu" hidden role="menu">${moreLinks}</div>`;
  wire();
  if(window.lucide) window.lucide.createIcons();
  // La nav déborde sur les pages étroites et en mobile (scrollbar masquée) :
  // sans ceci, l'onglet actif peut être totalement hors-champ. Recalé après le
  // premier layout ET après le chargement des fontes (les largeurs bougent).
  const centerActive = ()=>{
    const nav = host.querySelector(".mtg-nav");
    const act = nav && nav.querySelector("a.active, .mtg-more.active");
    if(!nav || !act) return;
    if(nav.scrollWidth > nav.clientWidth){
      const left = act.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
      nav.scrollLeft = Math.max(0, left - (nav.clientWidth - act.offsetWidth)/2);
    }
  };
  requestAnimationFrame(centerActive);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(centerActive));
  setTimeout(centerActive, 600);
}

function mountFab(){
  injectStyles();
  if(document.getElementById("mtg-fab")) return;
  const fab=document.createElement("div"); fab.className="mtg-fab"; fab.id="mtg-fab";
  fab.innerHTML=themeBtnHTML();
  document.body.appendChild(fab);
  wire();
  if(window.lucide) window.lucide.createIcons();
}

/* ============================================================
   Notifications — cloche d'activité (partagée)
   Lit le JOURNAL public.task_events directement (clé publishable, comme supa.js).
   Badge = nb d'événements depuis la dernière lecture (localStorage). Push navigateur
   opt-in (API Notifications) pour les nouveautés tant qu'un onglet est ouvert.
   Membre : ne voit/notifie que les événements le concernant (scope d'autorité).
   ============================================================ */
const N_SEEN="radar:notif:seen", N_PUSH="radar:notif:push";
const N_LAB={created:["🆕","Nouvelle entrée"],status:["🔁","Statut modifié"],reassigned:["👤","Réattribution"],
  deadline:["📅","Échéance modifiée"],frozen:["❄️","Gelé"],unfrozen:["♻️","Réactivé"],
  closed:["📦","Clôturé / livrable"],reopened:["🔓","Rouvert"],deleted:["🗑️","Supprimé"]};
const N_CRE={"Maître":["🆕","Nouveau brief"],"Tâche":["✅","Nouvelle tâche"],"Révision":["🔄","Nouvelle révision"]};
let NOTIFS=[];
function nSeen(){ try{return localStorage.getItem(N_SEEN)||"";}catch(e){return "";} }
function nSetSeen(v){ try{localStorage.setItem(N_SEEN,v);}catch(e){} }
function nLabel(e){ return (e.kind==="created"&&N_CRE[e.entree])||N_LAB[e.kind]||["•",e.kind]; }
function nAgo(iso){ const s=Math.max(0,(Date.now()-new Date(iso).getTime())/1000);
  if(s<90) return "à l'instant"; const m=s/60; if(m<60) return "il y a "+Math.round(m)+" min";
  const h=m/60; if(h<24) return "il y a "+Math.round(h)+" h"; const d=h/24;
  if(d<7) return "il y a "+Math.round(d)+" j"; return new Date(iso).toLocaleDateString("fr-FR",{day:"numeric",month:"short"}); }
function bellBtnHTML(){
  return `<button class="mtg-bell" id="mtg-bell" type="button" title="Activité & notifications" aria-label="Notifications">
    <i data-lucide="bell" style="width:16px;height:16px"></i><span class="badge" id="mtg-bell-badge" hidden>0</span></button>`;
}
async function nFetch(){
  if(!window.SUPA||!window.supaHeaders) return [];
  let me=null; try{ me=window.MTG_IDENTITY||(window.loadIdentity?await loadIdentity():null); }catch(e){}
  let r; try{
    r=await fetch(SUPA.url+"/rest/v1/task_events?select=id,at,ndeg,entree,kind,client,projet,summary,resp_old,resp_new&order=at.desc&limit=40",
      {headers:supaHeaders(),cache:"no-store"});
  }catch(e){ return []; }
  if(!r.ok) return [];
  let evs=await r.json();
  if(me && me.role==="member" && me.person){ const p=me.person;
    evs=evs.filter(e=>(e.resp_new||"").includes(p)||(e.resp_old||"").includes(p)); }
  return evs;
}
function paintBell(){
  const b=document.getElementById("mtg-bell-badge"); if(!b) return;
  const seen=nSeen(); const n=NOTIFS.filter(e=>!seen||e.at>seen).length;
  if(n>0){ b.hidden=false; b.textContent=n>99?"99+":String(n); } else b.hidden=true;
}
function nPush(list){
  if(!list.length) return;
  let on=false; try{on=localStorage.getItem(N_PUSH)==="1";}catch(e){}
  if(!on||!("Notification"in window)||Notification.permission!=="granted") return;
  const head=list.length===1 ? (nLabel(list[0])[1]+" — "+(list[0].client||list[0].projet||"")) : (list.length+" mouvements sur le pipe");
  const body=list.slice(0,4).map(e=>nLabel(e)[0]+" "+(e.summary||e.projet||"")).join("\n");
  try{ new Notification("Radar — activité", {body:head+"\n"+body, tag:"radar-activity", renotify:true}); }catch(e){}
}
async function notifPoll(initial){
  const prevTop=NOTIFS[0] && NOTIFS[0].at;
  NOTIFS=await nFetch();
  if(initial && !nSeen() && NOTIFS.length){ nSetSeen(new Date().toISOString()); } // pas de flood au 1er passage
  paintBell();
  if(!initial && prevTop){ nPush(NOTIFS.filter(e=>e.at>prevTop)); }
}
async function enablePush(){
  if(!("Notification"in window)){ alert("Ce navigateur ne supporte pas les notifications."); return; }
  let perm=Notification.permission;
  if(perm!=="granted") perm=await Notification.requestPermission();
  try{ localStorage.setItem(N_PUSH, perm==="granted"?"1":"0"); }catch(e){}
  if(perm==="granted"){ try{ new Notification("Radar", {body:"Notifications activées ✓"}); }catch(e){} }
}
function openNotifMenu(anchor){
  closeMenus();
  const seen=nSeen();
  const pushOn=(()=>{try{return localStorage.getItem(N_PUSH)==="1"&&("Notification"in window)&&Notification.permission==="granted";}catch(e){return false;}})();
  const menu=document.createElement("div"); menu.className="mtg-menu mtg-notif"; menu.id="mtg-id-menu";
  const items=NOTIFS.length ? NOTIFS.slice(0,30).map(e=>{
    const l=nLabel(e), unseen=!seen||e.at>seen;
    return `<button class="it${unseen?' unseen':''}" data-code="${esc(e.ndeg||'')}">
      <span class="em">${l[0]}</span><span class="tx"><span class="tt">${esc(l[1])} — ${esc(e.client||e.projet||'')}</span>
      <span class="mt">${esc(e.summary||'')} · ${esc(nAgo(e.at))}</span></span></button>`;
  }).join("") : `<div class="hd" style="padding:14px 9px">Aucune activité récente.</div>`;
  menu.innerHTML=`<div class="hd">Activité du pipe</div>${items}
    <div class="hd" style="border-top:1px solid var(--border);margin-top:6px;padding-top:8px">Notifications</div>
    <button data-act="seen"><span class="av">✓</span>Tout marquer comme lu</button>
    <button data-act="push"><span class="av">${pushOn?'🔔':'🔕'}</span>${pushOn?'Notifications navigateur : ON':'Activer les notifications navigateur'}</button>
    <button data-goto="/feed.xml"><span class="av">📰</span>Flux RSS</button>`;
  document.body.appendChild(menu);
  const r=anchor.getBoundingClientRect();
  menu.style.top=(window.scrollY+r.bottom+6)+"px";
  menu.style.right=Math.max(8,(window.innerWidth-r.right))+"px";
  menu.addEventListener("click",async e=>{
    const act=e.target.closest("[data-act]");
    if(act){ const a=act.getAttribute("data-act");
      if(a==="seen"){ nSetSeen(new Date().toISOString()); paintBell(); closeMenus(); }
      else if(a==="push"){ closeMenus(); await enablePush(); }
      return; }
    const g=e.target.closest("[data-goto]"); if(g){ window.open(g.getAttribute("data-goto"),"_blank","noopener"); return; }
    const it=e.target.closest("[data-code]"); if(it){ const c=it.getAttribute("data-code");
      if(c){ nSetSeen(new Date().toISOString()); location.href="tache.html?code="+encodeURIComponent(c); } }
  });
}

/* Footer partagé : liens du flux d'activité (RSS + JSON Feed). Le flux est public
   par défaut (cf. functions/_feed.js) → liens bruts. Monté une seule fois en bas de page. */
function mountFooter(){
  if(document.getElementById("mtg-foot")) return;
  const f=document.createElement("footer"); f.className="mtg-foot"; f.id="mtg-foot";
  f.innerHTML=`<div class="brand">
      <svg class="mtg-logo-svg" viewBox="0 0 120 40" width="120" height="40" aria-label="RADAR">
        <text x="0" y="18" font-size="14" font-weight="900" textLength="120" lengthAdjust="spacing" class="l1-2">LE</text>
        <text x="0" y="36" font-size="16" font-weight="900" textLength="120" lengthAdjust="spacing" class="l3">RADAR</text>
      </svg>
    </div>
    <nav class="feeds" aria-label="Flux d'activité">
      <span class="lbl">Flux d'activité</span>
      <a href="/feed.xml" target="_blank" rel="noopener" title="Flux RSS de l'activité du pipe"><i data-lucide="rss" style="width:13px;height:13px"></i>RSS</a>
      <a href="/activity.json" target="_blank" rel="noopener" title="JSON Feed (jsonfeed.org)"><i data-lucide="braces" style="width:13px;height:13px"></i>JSON</a>
    </nav>`;
  document.body.appendChild(f);
}

function wire(){
  document.querySelectorAll(".mtg-theme").forEach(b=>{ if(b.dataset.wired) return; b.dataset.wired="1";
    b.addEventListener("click",toggleTheme); });
  const id=document.getElementById("mtg-id");
  if(id && !id.dataset.wired){ id.dataset.wired="1";
    id.addEventListener("click",e=>{ e.stopPropagation(); if(document.getElementById("mtg-id-menu")){closeMenus();return;} openIdMenu(id); }); }
  const bell=document.getElementById("mtg-bell");
  if(bell && !bell.dataset.wired){ bell.dataset.wired="1";
    bell.addEventListener("click",e=>{ e.stopPropagation(); if(document.getElementById("mtg-id-menu")){closeMenus();return;} openNotifMenu(bell); }); }
  // menu « Plus » (overflow de la nav)
  const more=document.getElementById("mtg-more"), mm=document.getElementById("mtg-more-menu");
  if(more && mm && !more.dataset.wired){ more.dataset.wired="1";
    more.addEventListener("click",e=>{ e.stopPropagation(); closeMenus();
      const open=mm.hidden===false; if(open){ mm.hidden=true; return; }
      const r=more.getBoundingClientRect(); mm.style.top=(r.bottom+6)+"px"; mm.style.left=Math.max(8,Math.min(r.left,window.innerWidth-228))+"px"; mm.hidden=false; });
    mm.addEventListener("click",e=>{ const g=e.target.closest("[data-goto]"); if(g) location.href=g.getAttribute("data-goto"); });
  }
  if(!document.body.dataset.mtgDocWired){ document.body.dataset.mtgDocWired="1";
    document.addEventListener("click",e=>{ if(!e.target.closest(".mtg-menu")&&!e.target.closest("#mtg-id")) closeMenus();
      const mm2=document.getElementById("mtg-more-menu"); if(mm2 && !e.target.closest("#mtg-more-menu") && !e.target.closest("#mtg-more")) mm2.hidden=true; });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeMenus(); const mm2=document.getElementById("mtg-more-menu"); if(mm2) mm2.hidden=true; } }); }
}

function boot(){
  const host=document.getElementById("mtg-top");
  if(host){ mountBar(host); mountFooter(); } else mountFab();
  if(window.lucide) window.lucide.createIcons();
  // Charge le niveau d'autorité (owner/supervisor/member) puis rafraîchit la puce d'identité.
  if(window.loadIdentity){ try{ loadIdentity().then(applyIdent).catch(()=>{}); }catch(e){} }
  // Cloche d'activité : 1er chargement puis polling léger (60 s) tant que la page est ouverte.
  if(document.getElementById("mtg-bell")){
    notifPoll(true);
    setInterval(()=>{ if(document.visibilityState!=="hidden") notifPoll(false); }, 60000);
  }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

})();
