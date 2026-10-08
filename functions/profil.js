// Route /profil — self-service du mot de passe par utilisateur.
// Sécurité : cette route passe par le mur (_middleware), donc l'appelant est déjà
// authentifié. L'email vient du middleware (context.data.email, fiable — posé après
// validation cookie OU Basic Auth), avec repli sur l'en-tête Authorization. Jamais
// depuis le corps → on ne peut changer QUE son propre mot de passe.
// Stockage : Cloudflare KV (binding DASH_USERS), valeur en clair (repo privé, faible enjeu).
// Renvoie aussi le NIVEAU D'AUTORITÉ (role + person) lu depuis functions/_authz.js,
// pour que le front restreigne la vue (owner=tout, supervisor=toutes les tâches, member=ses tâches).
"use strict";

import { identityFor, monthKey } from "./_authz.js";

function emailFromAuth(request) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ")) return "";
  try {
    const d = atob(h.slice(6));
    const i = d.indexOf(":");
    return (i >= 0 ? d.slice(0, i) : "").trim().toLowerCase();
  } catch { return ""; }
}
// Email authentifié : priorité au middleware (gère la session cookie), repli sur Basic Auth.
function authedEmail(context) {
  const fromMw = context.data && context.data.email;
  return (fromMw || emailFromAuth(context.request) || "").trim().toLowerCase();
}
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// GET /profil → identité courante + indique si un mot de passe perso est déjà défini.
export async function onRequestGet(context) {
  const { env } = context;
  const email = authedEmail(context);
  if (!email) return json({ ok: false, error: "non authentifié" }, 401);
  let perso = false;
  if (env.DASH_USERS) { try { perso = !!(await env.DASH_USERS.get(email)); } catch {} }
  const id = identityFor(email);   // { email, person, role }
  return json({ ok: true, email, person: id.person, role: id.role, taskMonth:monthKey(), perso, kv: !!env.DASH_USERS });
}

// POST /profil { nouveau } → définit le mot de passe perso de l'appelant.
export async function onRequestPost(context) {
  const { request, env } = context;
  const email = authedEmail(context);
  if (!email) return json({ ok: false, error: "non authentifié" }, 401);
  if (!env.DASH_USERS) return json({ ok: false, error: "Stockage KV non configuré (binding DASH_USERS manquant — voir wrangler.toml)." }, 500);
  let body = {};
  try { body = await request.json(); } catch {}
  const np = (body && body.nouveau != null ? String(body.nouveau) : "").trim();
  if (np.length < 4) return json({ ok: false, error: "Mot de passe trop court (4 caractères minimum)." }, 400);
  try {
    await env.DASH_USERS.put(email, np);
    return json({ ok: true, email });
  } catch (e) {
    return json({ ok: false, error: "Échec d'enregistrement : " + (e && e.message) }, 502);
  }
}
