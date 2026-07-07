"use strict";
/* ============================================================
   Export CSV — télécharge l'état LIVE de la base (public.briefs)
   au format identique à INDEX.csv (mêmes colonnes, Entré par inclus).
   Requiert supa.js (SUPA + supaHeaders). window.exportBriefsCSV().
   ============================================================ */
(function(){
  const HEAD=["N°","Client","Marque","Cluster","Pays","Projet","Niveau","Type","Statut","Priorité",
    "Avancement","Deadline","Responsable","Livrables","Date réception","threadId","Type entrée",
    "Rattaché à","Commentaires","Doc-Brief","Doc-Propal","Doc-Livr","Entré par"];
  const COLS=["ndeg","client","marque","cluster","pays","projet","niveau","type","statut","prio",
    "avancement","deadline","responsable","livrables","date_reception","thread_id","entree",
    "parent","comm","doc_brief","doc_propal","doc_livr","entre_par"];
  const cell=v=>{ v=(v==null?"":String(v)); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const stamp=()=>{ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };

  async function exportBriefsCSV(btn){
    const old = btn ? btn.innerHTML : null;
    if(btn){ btn.disabled=true; btn.dataset.busy="1"; }
    try{
      const url = SUPA.url+"/rest/v1/"+SUPA.table+"?select=*&order=ndeg.asc&limit=5000";
      const r = await fetch(url, {headers:supaHeaders(), cache:"no-store"});
      if(!r.ok) throw new Error("Supabase HTTP "+r.status);
      let rows = await r.json();
      /* Garde CONFIDENTIALITÉ : on n'exporte jamais une ligne private_to ≠ moi. */
      try{ const id=window.loadIdentity?await loadIdentity():null; const me=id?id.person:"";
        rows=rows.filter(o=>{ const p=String(o.private_to||"").trim(); return !p||p===me; }); }catch(e){}
      rows.sort((a,b)=>(a.ndeg||"").localeCompare(b.ndeg||"",undefined,{numeric:true}));
      const lines=[HEAD.join(",")];
      for(const o of rows) lines.push(COLS.map(c=>cell(o[c])).join(","));
      const blob=new Blob([lines.join("\n")+"\n"],{type:"text/csv;charset=utf-8"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="radar-briefs-"+stamp()+".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);
      if(btn){ btn.innerHTML="✓ "+rows.length+" lignes"; setTimeout(()=>{ btn.innerHTML=old; },1800); }
    }catch(e){
      alert("Export CSV impossible : "+e.message+"\n(la base Supabase doit être active)");
      if(btn) btn.innerHTML=old;
    }finally{
      if(btn){ btn.disabled=false; delete btn.dataset.busy; }
    }
  }
  window.exportBriefsCSV = exportBriefsCSV;
})();
