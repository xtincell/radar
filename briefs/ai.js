"use strict";
/* ============================================================
   Radar — couche IA optionnelle (ai.js)
   Lit une SOURCE brute (message, screen WhatsApp retranscrit, texte de
   PPTX, notes de réunion) et en extrait une fiche structurée pour
   pré-remplir un ticket. Branché sur OpenRouter (clé fournie par
   l'utilisateur, stockée en local). Contrat de conversion AGRESSIF :
   extraction → auto-critique → passe ciblée sur les champs douteux,
   pour ne laisser passer aucune erreur. La soumission reste manuelle.
   Expose window.MTG_AI. Chargé après supa.js/ui.js.
   ============================================================ */
(function(){
const LS_KEY="radar:openrouter:key", LS_MODEL="radar:openrouter:model";
const DEFAULT_MODEL="openai/gpt-4o-mini";
const get=(k,d)=>{try{return localStorage.getItem(k)||d;}catch(e){return d;}};
const set=(k,v)=>{try{ v?localStorage.setItem(k,v):localStorage.removeItem(k); }catch(e){}};

/* Contexte agence : permet au modèle d'inférer responsable / type / préfixe / statut comme le ferait l'équipe. */
const CONTEXT = `Tu structures des demandes entrantes pour l'agence. Tu connais :
ÉQUIPE & RÔLE D'EXÉCUTANT (responsable) — déduis dans CET ORDRE (spécialité > client > type), selon la configuration de routage de l'équipe (le membre en charge de chaque spécialité, client ou type par défaut) :
 1) Spécialité technique déclarée (3D/modélisation, vidéo/spot/animatique/motion/film/tournage, branding identité, branding de supports, opérations terrain/activation/événementiel/stand/animation PDV) → le membre en charge de cette spécialité.
 2) Client ou marque dédié à un membre spécifique → ce membre.
 3) sinon par TYPE (Création KV & DA Campaign, Packaging, Stratégie & Pitch, Modification, Digital/Social, Facturation/coordination/Autre) → le membre assigné par défaut à ce type.
DEMANDEUR (entre_par) = qui relaie la demande (souvent l'auteur du message). responsable ≠ entre_par.
CLIENTS → préfixe : selon la table de préfixes clients configurée pour l'agence.
STATUTS autorisés : "Reçu","En cours","En attente client","Bloqué","Livré". TYPES : "Création KV","Packaging","DA Campaign","Production vidéo","Stratégie","Modification","Pitch","Autre". NIVEAU : "Production","Concept","Récurrent". PRIO : P0 (urgent) à P3, défaut P1.
CHAMPS à produire (JSON strict, valeurs vides "" si absent) : client, marque, projet, type, niveau, prio, deadline (YYYY-MM-DD ou ""), pays, cluster, responsable, entre_par, livrables, statut, comm (résumé court 1 phrase). "projet" = intitulé clair et concis du livrable/projet.`;

const AI = {
  hasKey:()=>!!get(LS_KEY,""),
  getKey:()=>get(LS_KEY,""), setKey:v=>set(LS_KEY,(v||"").trim()),
  getModel:()=>get(LS_MODEL,DEFAULT_MODEL), setModel:v=>set(LS_MODEL,(v||"").trim()||DEFAULT_MODEL),

  /* configuration minimale (clé + modèle) via invites — pas de secret en dur */
  configure(){
    const has=AI.hasKey();
    const k=prompt("Clé API OpenRouter (sk-or-…)"+(has?" — laisse vide pour garder l'actuelle":"")+" :", "");
    if(k!==null && k.trim()) AI.setKey(k.trim());
    const m=prompt("Modèle OpenRouter\n(ex. openai/gpt-4o-mini, anthropic/claude-sonnet-4, google/gemini-2.5-flash) :", AI.getModel());
    if(m!==null && m.trim()) AI.setModel(m.trim());
    return AI.hasKey();
  },

  /* Vérifie clé + crédit (endpoint OpenRouter /key). Sert à dégriser le bouton
     UNIQUEMENT quand une API est connectée ET qu'il reste du crédit. */
  async checkAccess(){
    if(!AI.hasKey()) return {ok:false, reason:"no-key"};
    try{
      const r=await fetch("https://openrouter.ai/api/v1/key",{headers:{"Authorization":"Bearer "+AI.getKey()}});
      if(!r.ok) return {ok:false, reason:r.status===401?"bad-key":"http"};
      const d=(await r.json()).data||{};
      const rem=d.limit_remaining;
      const hasCredit = (d.limit==null) || (rem!=null ? rem>0 : ((d.usage||0) < d.limit));
      return {ok:!!hasCredit, reason: hasCredit?"ok":"no-credit", data:d};
    }catch(e){ return {ok:false, reason:"net"}; }
  },
  async _chat(messages,{temperature=0}={}){
    if(!AI.hasKey()) throw new Error("Pas de clé OpenRouter — clique ⚙︎ pour la configurer.");
    const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",
      headers:{"Authorization":"Bearer "+AI.getKey(),"Content-Type":"application/json","HTTP-Referer":location.origin,"X-Title":"Radar"},
      body:JSON.stringify({model:AI.getModel(),temperature,response_format:{type:"json_object"},messages})});
    if(!r.ok){ const t=await r.text(); throw new Error("OpenRouter "+r.status+" : "+t.slice(0,180)); }
    const d=await r.json();
    return (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||"{}";
  },
  _json(s){ try{ return JSON.parse(s); }catch(e){
    const m=String(s).match(/\{[\s\S]*\}/); if(m){ try{ return JSON.parse(m[0]); }catch(_){} }
    return {}; } },

  /* Extraction multi-passes. onPass(label) pour le retour UI. Renvoie {fields, confidence, issues}. */
  async extractFiche(source, {onPass}={}){
    source=String(source||"").trim();
    if(!source) throw new Error("Source vide.");
    const today=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
    const sys=CONTEXT+`\nDate du jour : ${today}. Réponds UNIQUEMENT en JSON.`;

    // — passe 1 : extraction —
    onPass&&onPass("Extraction…");
    const p1=this._json(await this._chat([
      {role:"system",content:sys},
      {role:"user",content:`SOURCE (brute) à convertir en fiche :\n"""\n${source}\n"""\nProduis l'objet JSON des champs.`}
    ]));

    // — passe 2 : auto-critique agressive + correction —
    onPass&&onPass("Vérification (passe 2)…");
    const p2=this._json(await this._chat([
      {role:"system",content:sys+`\nTu es maintenant CONTRÔLEUR. Contrat : ne laisser AUCUNE erreur. Relis la source mot à mot, vérifie CHAQUE champ. Corrige toute valeur fausse, incohérente, hallucinée ou mal déduite (surtout responsable, entre_par, type, deadline). Si un champ n'est pas étayé par la source, mets "". Ne complète JAMAIS par invention.`},
      {role:"user",content:`SOURCE :\n"""\n${source}\n"""\n\nEXTRACTION À VÉRIFIER :\n${JSON.stringify(p1)}\n\nRenvoie un JSON : {"fields":{…tous les champs corrigés…},"confidence":{"<champ>":0..1,…},"issues":["…"]}.`}
    ]));
    let fields=p2.fields||p1, confidence=p2.confidence||{}, issues=p2.issues||[];

    // — passe 3 (forcée si doute) : tranche les champs incertains —
    const weak=Object.keys(confidence).filter(k=>confidence[k]<0.6);
    if(weak.length || (issues&&issues.length)){
      onPass&&onPass("Passe ciblée (champs douteux)…");
      const p3=this._json(await this._chat([
        {role:"system",content:sys+`\nDernière passe. Tranche définitivement. Pour chaque champ douteux, choisis la valeur la MIEUX étayée par la source, sinon "". Zéro invention.`},
        {role:"user",content:`SOURCE :\n"""\n${source}\n"""\n\nFICHE ACTUELLE :\n${JSON.stringify(fields)}\nCHAMPS DOUTEUX : ${weak.concat((issues||[]).length?["(voir issues)"]:[]).join(", ")||"—"}\nProblèmes signalés : ${JSON.stringify(issues||[])}\n\nRenvoie {"fields":{…fiche finale…},"confidence":{…},"issues":[…]}.`}
      ]));
      if(p3.fields) fields=p3.fields;
      if(p3.confidence) confidence=p3.confidence;
      if(p3.issues) issues=p3.issues;
    }
    onPass&&onPass("");
    return {fields:fields||{}, confidence:confidence||{}, issues:issues||[]};
  }
};
window.MTG_AI = AI;
})();
