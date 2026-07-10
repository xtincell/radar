"use strict";
/* ============================================================
   Visuels de livrables — client (visuels.js)
   Compression côté navigateur (canvas → WebP ≤1200px, pipeline
   repris d'image-slot.js) puis POST /visuels (le cookie du mur
   fait foi). Lecture des métadonnées via /rest/v1/brief_assets.
   Chargé APRÈS supa.js (supaHeaders) et ui.js.
   ============================================================ */
(function(){

const MAX_DIM = 1200;                    // côté long max — retina sans obésité
// Raster uniquement : SVG exclu (peut porter du script), GIF exclu (le
// ré-encodage canvas ne garde que la première frame — refuser vaut mieux
// que rendre muet un GIF animé sans prévenir).
const ACCEPT = ["image/png","image/jpeg","image/webp","image/avif"];

/* fichier → data-URL WebP compressée (recadrage non destructif : on ne fait
   que réduire, jamais rogner). Jette une Error à message lisible. */
async function compressToWebp(file){
  if(!file || ACCEPT.indexOf(file.type) < 0)
    throw new Error("Formats acceptés : PNG, JPEG, WebP, AVIF (pas de SVG/GIF).");
  const bitmap = await createImageBitmap(file);
  try{
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/webp", 0.85);
  } finally { if(bitmap.close) bitmap.close(); }
}

/* upload d'un fichier image sur un brief → ligne brief_assets (ou Error) */
async function uploadVisuel(ndeg, file, caption){
  const data = await compressToWebp(file);
  const r = await fetch("/visuels", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ndeg: ndeg, caption: caption || "", data: data }),
  });
  const body = await r.json().catch(function(){ return {}; });
  if(!r.ok) throw new Error(body.message || ("HTTP " + r.status));
  return body;
}

function _rest(q){
  return fetch("/rest/v1/brief_assets?" + q, { headers: supaHeaders(), cache: "no-store" })
    .then(function(r){ return r.ok ? r.json() : []; })
    .catch(function(){ return []; });
}
/* visuels d'un brief (plus récents d'abord) */
function loadVisuels(ndeg){
  return _rest("ndeg=eq." + encodeURIComponent(ndeg) + "&order=created_at.desc&limit=60");
}
/* visuels récents toutes fiches confondues (mur des travaux) */
function loadVisuelsRecents(limit){
  return _rest("order=created_at.desc&limit=" + (limit || 40));
}
async function deleteVisuel(id){
  const r = await fetch("/visuels/" + id, { method: "DELETE" });
  const body = await r.json().catch(function(){ return {}; });
  if(!r.ok) throw new Error(body.message || ("HTTP " + r.status));
  return true;
}
const visuelUrl = function(a){ return "/visuels/" + a.filename; };

window.compressToWebp = compressToWebp;
window.uploadVisuel = uploadVisuel;
window.loadVisuels = loadVisuels;
window.loadVisuelsRecents = loadVisuelsRecents;
window.deleteVisuel = deleteVisuel;
window.visuelUrl = visuelUrl;

})();
