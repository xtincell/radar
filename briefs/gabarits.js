"use strict";
/* ============================================================
   Radar — gabarits.js  (MODE 100% LIVE)
   Le deck « Gabarits » (gabarits.html) est intégralement
   piloté par les données réelles d'une tâche. AUCUNE valeur d'exemple
   n'est conservée : chaque champ affiche la donnée live, et un champ
   vide affiche un placeholder neutre (—), jamais le texte d'exemple.

   URL : gabarits.html?code=<CODE>   (ex. ?code=NSI-002, ?code=FRC-041)
   - Sans code / tâche introuvable / hors-ligne  → ÉTAT VIDE (le deck est
     masqué et un message invite à fournir un code). On n'affiche jamais
     le gabarit d'exemple.

   Liaison :
   - [data-b="chemin"]  → nœuds de slide / modale / fiche (chemin dans le
     contexte : "projet", "client", "briefClient.insight_client",
     "caseStudy.kpi_portee", "suivi.tension_marche", "score.client"…).
   - Vues formulaire     → liaison positionnelle des « value divs » sur
     les tableaux de clés ci-dessous (repli placeholder si vide).
   - Scores de complétion → window.calcBriefScores (même source que
     tache.html), pastilles % recolorées.

   Chargé APRÈS supa.js + ui.js. Liaison purement textuelle : la mise en
   page reste pixel-perfect.
   ============================================================ */
(function(){
  var DECK = document.getElementById("gbrt-deck");
  if(!DECK) return;

  var PH = "—";   // placeholder « champ vide » (jamais d'exemple)

  function getCode(){
    var p = new URLSearchParams(location.search).get("code");
    if(p) return p.trim();
    var h = (location.hash||"").replace(/^#/,"");
    return /^[A-Za-z]{2,4}-?\d/.test(h) ? decodeURIComponent(h).trim() : "";
  }

  var norm = function(s){ return (s==null?"":String(s)).trim(); };
  function fmtVal(v){
    if(v==null) return "";
    if(Array.isArray(v)) return v.filter(function(x){return x!=null && String(x).trim()!=="";}).join(" · ");
    if(typeof v==="object") return "";
    return String(v);
  }
  function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function linkify(t){ return esc(t).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:#ED560A;font-weight:600;text-decoration:none;">lien ↗</a>'); }
  function initials(n){
    var p = norm(n).split(/\s+/); if(!p[0]) return "?";
    return ((p[0][0]||"") + (p.length>1 ? (p[1][0]||"") : "")).toUpperCase();
  }

  // ---- « Suivi & sources des mises à jour » : rendu du texte réel de briefs.comm ----
  // (même format que commTimeline() de tache.html : entrées séparées par « · »,
  // date ISO + [source] en tête de chaque entrée)
  var SRC_COLORS = {
    wa:   ["#dcf6e3","#137a3a"], sl:  ["#efe3f3","#7a2e86"], mail: ["#e3edfb","#1f5fb0"],
    ppt:  ["#fde3d6","#c2440a"], meet:["#fdeccb","#9a6a12"], drive:["#e6f0e6","#1f7a4d"],
    auto: ["#F0E9DD","#564D42"], "":  ["#F0E9DD","#564D42"]
  };
  function srcClass(s){
    s = (s||"").toLowerCase();
    if(/whats/.test(s)) return "wa"; if(/slack/.test(s)) return "sl"; if(/mail/.test(s)) return "mail";
    if(/power|ppt/.test(s)) return "ppt"; if(/r[ée]uni|meet/.test(s)) return "meet"; if(/drive/.test(s)) return "drive";
    if(/auto|backfill/.test(s)) return "auto"; return "";
  }
  function renderUpdateLog(comm){
    var host = document.getElementById("gbrt-updlog"); if(!host) return;
    if(!norm(comm)){ host.innerHTML = '<div style="font-size:13.5px;color:#9A8F80;">Aucune mise à jour consignée pour ce projet.</div>'; return; }
    var parts = String(comm).split(/\s·\s+/).map(function(s){ return s.trim(); }).filter(Boolean);
    host.innerHTML = parts.map(function(p){
      var dm = p.match(/(\d{4}-\d{2}-\d{2})/), date = dm ? dm[1] : "";
      var src = "", sb = p.match(/\[([^\]]+)\]/);
      if(sb) src = sb[1];
      else { var m2 = p.match(/\b(WhatsApp|Slack|Mail|Drive|PowerPoint|R[ée]union|backfill)\b/i); if(m2) src = m2[1]; }
      var text = p.replace(/^MAJ\s+\d{4}-\d{2}-\d{2}\s*/i,"").replace(/^\[[^\]]+\]\s*/,"").replace(/^[:：]\s*/,"").trim() || p;
      var col = SRC_COLORS[srcClass(src)] || SRC_COLORS[""];
      return '<div style="display:grid;grid-template-columns:112px 1fr;gap:12px;align-items:start;background:#FCFAF6;border:1px solid #E6DCCB;border-radius:11px;padding:10px 13px;">'
        + '<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;">'
        + (date ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#756A5C;font-weight:600;white-space:nowrap;">'+esc(date)+'</span>' : "")
        + (src ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 8px;border-radius:999px;background:'+col[0]+';color:'+col[1]+';white-space:nowrap;">'+esc(src)+'</span>' : "")
        + '</div><div style="font-size:13.5px;line-height:1.45;color:#161310;">'+linkify(text)+'</div></div>';
    }).join("");
  }

  // ---- « Commentaires & observations » : rendu en lecture seule depuis public.comments ----
  async function renderCommentsList(ndeg){
    var host = document.getElementById("gbrt-comments"); if(!host) return;
    if(window.SUPA_SOURCE !== "supabase" || typeof window.loadComments !== "function"){
      host.innerHTML = '<div style="font-size:13.5px;color:#9A8F80;">Commentaires disponibles uniquement en ligne (base live).</div>'; return;
    }
    var list = [];
    try { list = await window.loadComments(ndeg) || []; }
    catch(e){ host.innerHTML = '<div style="font-size:13.5px;color:#9A8F80;">Commentaires indisponibles (base).</div>'; return; }
    if(!list.length){ host.innerHTML = '<div style="font-size:13.5px;color:#9A8F80;">Aucun commentaire pour l\'instant.</div>'; return; }
    host.innerHTML = list.map(function(c){
      var obs = c.kind === "observation";
      return '<div style="display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:start;background:'+(obs?"#FFF4EC":"#FCFAF6")+';border:1px solid '+(obs?"#FFD3AE":"#E6DCCB")+';border-radius:12px;padding:11px 13px;">'
        + '<span style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:11.5px;font-weight:700;background:'+(obs?"#FF6A14":"#1F1B17")+';color:#fff;flex:0 0 auto;">'+esc(initials(c.author))+'</span>'
        + '<div style="min-width:0;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">'
        + '<span style="font-weight:700;font-size:13.5px;color:#161310;">'+esc(c.author||"—")+'</span>'
        + (obs ? '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 7px;border-radius:999px;background:#FFE0C7;color:#C2440A;">observation</span>'
               : '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 7px;border-radius:999px;background:#F0E9DD;color:#564D42;">commentaire</span>')
        + '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10.5px;color:#9A8F80;">'+esc(norm(c.created_at).slice(0,10))+'</span>'
        + '</div><div style="font-size:13.5px;line-height:1.5;color:#161310;">'+linkify(c.body)+'</div></div></div>';
    }).join("");
  }

  // ---- vues formulaire : ordre EXACT des « value divs » de chaque vue ----
  var BC_KEYS = [
    "contexte_business","contexte_marque","contexte_market","contexte_com",
    "probleme_marketing","obj_business","obj_marketing","obj_communication",
    "cible_principale","cible_secondaire","cible_socio_eco","cible_situation",
    "cible_frein","cible_motivation","cible_langage","insight_client","big_idea",
    "axe1_nom","axe1_intention","axe1_promesse","axe1_ton","axe1_copy_p","axe1_copy_s","axe1_preuve",
    "axe2_nom","axe2_intention","axe2_promesse","axe2_ton","axe2_copy_p","axe2_copy_s","axe2_preuve",
    "contrainte_marque","contrainte_legale","contrainte_culturelle","contrainte_produit","contrainte_format","contrainte_delai"
  ];
  var DC_KEYS = [
    "status_validation","message_claim","challenge_creatif","principe_creatif",
    "concept1_nom","concept1_axe","concept1_piste","concept1_croisement","concept1_univers","concept1_safe","concept1_reco","concept1_money",
    "concept2_nom","concept2_axe","concept2_piste", null,
    "da_style_image","da_lumiere","da_cadrage","da_decor","da_styling","da_attitude","da_palette","da_typo","da_retouche",
    "copy_claim","copy_accroche","copy_explication","copy_cta","reco_agence"
  ];
  var BP_KEYS = [
    "status_production","livrable_principal","nb_slides","ratio","plateformes","responsable_prod","deadline_prod",
    "spec_social_portrait","spec_carre","spec_story","spec_export","spec_safety_zone","spec_file_weight","spec_naming"
  ];
  var CS_KEYS = [
    "status_validation","big_idea","challenge","insight","strategie","concept_retenu","execution","da",
    "kpi_portee","kpi_impressions","kpi_engagement","kpi_taux_eng","kpi_clics","kpi_leads","kpi_sentiment","kpi_verbatims","kpi_reutilisabilite",
    "learning_ok","learning_improve","learning_platform","learning_industrial","learning_sell"
  ];

  function valueDivs(scope){
    return Array.prototype.filter.call(scope.querySelectorAll("div[style]"), function(d){
      var s = d.getAttribute("style") || "";
      return s.indexOf("border-radius:8px;padding:9px 11px") !== -1
          || s.indexOf("border-radius:8px;padding:10px 11px") !== -1;
    });
  }
  function screen(label){ return DECK.querySelector('[data-screen-label="'+label+'"]'); }

  function bindForm(label, keys, obj){
    var host = screen(label); if(!host) return;
    var divs = valueDivs(host);
    if(divs.length !== keys.length){
      console.warn("[gabarits] "+label+": "+divs.length+" champs vs "+keys.length+" clés — liaison ignorée (structure modifiée ?)");
      return;
    }
    keys.forEach(function(k,i){
      if(!k){ return; }              // champ combiné sans clé unique → laissé tel quel
      var v = fmtVal(obj[k]);
      divs[i].textContent = (norm(v) !== "") ? v : PH;
    });
  }

  // ---- contexte de résolution des chemins data-b ----
  function buildCtx(m, scores){
    var resp = (typeof window.normResp==="function" ? window.normResp(m.responsable) : m.responsable) || m.responsable;
    return {
      // identité (plat)
      ndeg:m.ndeg, projet:m.projet, client:m.client, marque:m.marque, pays:m.pays, cluster:m.cluster,
      zone: norm(m.pays) + (norm(m.cluster) ? " · "+norm(m.cluster) : ""),
      niveau:m.niveau, type:m.type, statut:m.statut, prio:m.prio, avancement:m.avancement,
      deadline:m.deadline, reception:m.date, responsable:resp, demandeur:m.entrePar,
      entree:m.entree, livrables:m.livrables, briefEtat:m.briefEtat,
      // blobs
      briefClient:m.briefClient||{}, briefCreatif:m.briefCreatif||{},
      briefProduction:m.briefProduction||{}, caseStudy:m.caseStudy||{}, suivi:m.suivi||{},
      // scores
      score: scores || {}
    };
  }
  function resolve(ctx, path){
    if(!path) return "";
    var parts = path.split("."), cur = ctx;
    for(var i=0;i<parts.length;i++){
      if(cur==null) return "";
      cur = cur[parts[i]];
    }
    return fmtVal(cur);
  }

  function bindDataB(ctx){
    var nodes = DECK.querySelectorAll("[data-b]");
    Array.prototype.forEach.call(nodes, function(el){
      var v = resolve(ctx, el.getAttribute("data-b"));
      el.textContent = (norm(v) !== "") ? v : PH;
    });
  }

  // remplace le jeton code d'exemple (NSI-002) partout où il reste dans un
  // libellé composite (eyebrows « NSI-002 · Maître », « NSI-002 · Fiche projet »…)
  function replaceCodeToken(ndeg){
    var OLD = "NSI-002";
    if(!ndeg || ndeg === OLD) return;
    var walker = document.createTreeWalker(DECK, NodeFilter.SHOW_TEXT, null);
    var n, hits = [];
    while((n = walker.nextNode())){ if(n.nodeValue && n.nodeValue.indexOf(OLD) !== -1) hits.push(n); }
    hits.forEach(function(tn){ tn.nodeValue = tn.nodeValue.split(OLD).join(ndeg); });
  }

  // ---- scores de complétion (mêmes % que tache.html) ----
  function bindScores(scores){
    if(!scores) return;
    var order = [scores.client, scores.crea, scores.prod, scores.caseStudy];
    var col = function(p){
      if(p >= 100) return {c:"#1F9D63", b:"#E2F4EA"};
      if(p > 0)    return {c:"#C2440A", b:"#FFE3CC"};
      return {c:"#9A8F80", b:"#F0E9DD"};
    };
    var spans = Array.prototype.filter.call(DECK.querySelectorAll("span[style]"), function(sp){
      var st = sp.getAttribute("style") || "";
      return st.indexOf("font-size:10px") !== -1 && /^\d+%$/.test((sp.textContent||"").trim());
    });
    spans.forEach(function(sp,i){
      var p = order[i % 4]; if(p == null) return;
      sp.textContent = p + "%";
      var c = col(p); sp.style.color = c.c; sp.style.background = c.b;
    });
  }

  function emptyState(msg){
    DECK.style.display = "none";
    var box = document.createElement("div");
    box.style.cssText = "max-width:640px;margin:12vh auto;padding:36px 40px;background:#FFFFFF;border:1px solid #E6DCCB;"
      + "border-radius:24px;box-shadow:0 24px 60px rgba(40,30,18,.10);text-align:center;font-family:var(--font-sans),'Hanken Grotesk',sans-serif;";
    box.innerHTML = '<div style="font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#FF6A14;font-weight:700;">Gabarits · mode live</div>'
      + '<h1 style="font-family:var(--font-display),\'Familjen Grotesk\',sans-serif;font-weight:600;font-size:30px;letter-spacing:-.02em;margin:12px 0 10px;color:#161310;">'+msg+'</h1>'
      + '<p style="font-size:15px;line-height:1.5;color:#564D42;margin:0 0 20px;">Ce deck se remplit à partir d\'une tâche réelle. Ouvrez-le avec un code de tâche, par exemple :</p>'
      + '<code style="display:inline-block;font-family:var(--font-mono),monospace;font-size:13.5px;color:#C2440A;background:#FFF3EA;border:1px solid #FFD3AE;border-radius:10px;padding:9px 14px;">gabarits.html?code=NSI-002</code>'
      + '<div style="margin-top:22px;"><a href="dashboard.html" style="text-decoration:none;font-size:13.5px;font-weight:600;color:#161310;background:#F7F2EA;border:1px solid #E6DCCB;border-radius:999px;padding:10px 18px;">← Choisir une tâche dans Projets</a></div>';
    (document.body || document.documentElement).insertBefore(box, DECK);
  }

  function liveBadge(ndeg){
    var b = document.createElement("div");
    b.textContent = "● Données live · " + ndeg;
    b.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:9000;font-family:'JetBrains Mono',ui-monospace,monospace;"
      + "font-size:11px;font-weight:700;letter-spacing:.03em;padding:7px 12px;border-radius:999px;background:#161310;color:#F7F2EA;"
      + "box-shadow:0 8px 24px rgba(40,30,18,.18);pointer-events:none;";
    document.body.appendChild(b);
  }

  // ---- ONGLET 0 dérivé des sources canoniques (wiki/marques + brief + étalon) ----
  // Le blob `suivi` (m.suivi) sert d'OVERRIDE facultatif par projet ; à défaut,
  // chaque champ est dérivé du wiki (client_markets/client_contacts/clients),
  // des blobs brief, ou calculé (règle étalon de ui.js). Jamais inventé.
  function isoPlus(rc, days){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(rc||"").slice(0,10))) return "";
    var d = new Date(String(rc).slice(0,10) + "T00:00:00");
    d.setDate(d.getDate() + Math.max(0, Math.round(days)));
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  async function buildOnglet0(m, rows){
    var su = m.suivi || {};
    var bc = m.briefClient || {}, dcr = m.briefCreatif || {};
    var market = {}, contact = {}, fiche = {};
    try {
      if(typeof window.loadMarkets === "function"){
        var mk = (await window.loadMarkets(m.client)) || [];
        market = mk.find(function(r){ return norm(r.marque) && norm(m.marque) && r.marque.indexOf(m.marque)!==-1; })
              || mk.find(function(r){ return norm(r.pays) === norm(m.pays); }) || mk[0] || {};
      }
    } catch(e){}
    try {
      if(typeof window.loadContacts === "function"){
        var ct = (await window.loadContacts(m.client)) || [];
        contact = ct.find(function(r){ return /principal|lead|d[ée]cideur|validation|marketing|top management/i.test(norm(r.role)); }) || ct[0] || {};
      }
    } catch(e){}
    try {
      if(typeof window.loadClients === "function"){
        var cl = (await window.loadClients()) || [];
        fiche = cl.find(function(r){ return norm(r.nom) === norm(m.client); }) || {};
      }
    } catch(e){}
    // étalon (mêmes fonctions que le reste de l'app)
    var duree = null, dateEtalon = "", realiste = "", lecture = "";
    try {
      if(typeof window.leadBenchmark === "function"){
        var bench = window.leadBenchmark(rows || []);
        duree = (bench && bench.byType && bench.byType[m.type] != null) ? bench.byType[m.type]
              : (bench ? bench.overall : null);
        dateEtalon = isoPlus(m.date, duree || 0);
        realiste = (typeof window.realisticDeadlineISO === "function") ? (window.realisticDeadlineISO(m, bench) || "") : "";
        if(duree != null && dateEtalon){
          lecture = "Durée étalon " + duree + " j (standard " + (norm(m.type) || "type") + ") + 5 j ouvrés de marge agence → délai réaliste"
                  + (realiste ? " le " + realiste : "") + ".";
        }
      }
    } catch(e){}
    // aplatit un texte markdown léger (exigences wiki) pour un rendu propre en slide
    var mdFlat = function(t){
      return norm(t).replace(/^#+\s*/gm,"").replace(/\s*\n\s*[-*]\s*/g," · ").replace(/\s*\n+\s*/g," · ").replace(/\s{2,}/g," ").trim();
    };
    var pick = function(over, derived){ return norm(over) !== "" ? over : derived; };
    return {
      pitch:          pick(su.pitch,          fmtVal(dcr.copy_accroche)),
      brief_source:   pick(su.brief_source,   fmtVal(m.threadId)),
      lecture:        pick(su.lecture,        lecture),
      tension_marche: pick(su.tension_marche, mdFlat(fiche.exigences) || fmtVal(market.signature)),
      interlocuteur:  pick(su.interlocuteur,  fmtVal(contact.nom)),
      interlocuteur_role: pick(su.interlocuteur_role, fmtVal(contact.role)),
      vigilance:      pick(su.vigilance,      fmtVal(contact.conditions_validation)),
      langue:         pick(su.langue,         fmtVal(market.langue) || fmtVal(fiche.langues)),
      date_etalon:    pick(su.date_etalon,    dateEtalon),
      delai_realiste: pick(su.delai_realiste, realiste),
      duree_etalon:   pick(su.duree_etalon,   duree != null ? (duree + " j") : ""),
      marge:          pick(su.marge,          "+5 j ouvrés"),
      dimensions:     pick(su.dimensions,     fmtVal(market.dimensions)),
      claim_retenu:   pick(su.claim_retenu,   fmtVal(dcr.copy_claim) || fmtVal(market.claims)),
      specificites:   pick(su.specificites,   fmtVal(market.specificites)),
      conditions:     pick(su.conditions,     fmtVal(contact.conditions_validation))
    };
  }

  async function run(){
    var code = getCode();
    if(!code){ emptyState("Aucune tâche sélectionnée"); return; }
    var rows;
    try { rows = await window.loadBriefsLive(); }
    catch(e){ console.warn("[gabarits] données injoignables", e); emptyState("Données indisponibles (hors-ligne)"); return; }
    var m = (rows||[]).find(function(r){ return norm(r.ndeg).toLowerCase() === code.toLowerCase(); });
    if(!m){ emptyState("Tâche « "+code+" » introuvable"); return; }

    var byNdeg = {}; (rows||[]).forEach(function(r){ byNdeg[norm(r.ndeg)] = r; });
    var pcode = (m.entree === "Maître") ? m.ndeg : (m.parent || m.ndeg);
    var parent = byNdeg[norm(pcode)] || null;

    var scores = null;
    if(typeof window.calcBriefScores === "function"){
      try { scores = window.calcBriefScores(m, parent); } catch(e){ scores = null; }
    }
    var ctx = buildCtx(m, scores);
    try { ctx.og0 = await buildOnglet0(m, rows); } catch(e){ ctx.og0 = {}; }

    try {
      bindDataB(ctx);
      replaceCodeToken(norm(m.ndeg));
      bindScores(scores);
      bindForm("Formulaire Brief client", BC_KEYS, m.briefClient || {});
      bindForm("Formulaire DA Créa",      DC_KEYS, m.briefCreatif || {});
      bindForm("Formulaire Production",   BP_KEYS, m.briefProduction || {});
      bindForm("Formulaire Case study",   CS_KEYS, m.caseStudy || {});
      renderUpdateLog(m.comm);
    } catch(e){ console.error("[gabarits] liaison partielle", e); }
    renderCommentsList(norm(m.ndeg));

    document.title = "Radar — Gabarits · " + norm(m.ndeg) + " · " + norm(m.projet);
    liveBadge(norm(m.ndeg));
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
