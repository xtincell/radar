// ============================================================
// RADAR — cœur du flux d'activité (partagé)
// Source : table public.task_events = JOURNAL DURABLE alimenté par un trigger
// Postgres sur public.briefs (functions/_authz n/a). Chaque MOUVEMENT (création,
// changement de statut, réattribution, échéance, gel/dégel, clôture, suppression)
// y produit une ligne — quelle que soit la source (UI, SQL, LLM). 100% automatique,
// aucun LLM dans la boucle : c'est un pur effet d'un changement d'état en base.
// Sorties : RSS 2.0 (feed.xml) et JSON Feed 1.1 (activity.json).
// ============================================================
"use strict";
import { query as pgQuery, hasDb } from "../server/pgrest.js";

// Repli PostgREST distant (legacy, seulement si DATABASE_URL absent) : aucune
// valeur par défaut ici — fournir SUPA_URL / SUPA_KEY en env pour l'activer.
const SUPA_URL = "";
const SUPA_KEY = "";

// libellé + emoji par type d'événement
const LABEL = {
  created:    { e: "🆕", t: "Nouvelle entrée" },
  status:     { e: "🔁", t: "Statut modifié" },
  reassigned: { e: "👤", t: "Réattribution" },
  deadline:   { e: "📅", t: "Échéance modifiée" },
  frozen:     { e: "❄️", t: "Gelé" },
  unfrozen:   { e: "♻️", t: "Réactivé" },
  closed:     { e: "📦", t: "Clôturé / livrable" },
  reopened:   { e: "🔓", t: "Rouvert" },
  deleted:    { e: "🗑️", t: "Supprimé" },
  asset:          { e: "🖼️", t: "Visuel ajouté" },
  asset_deleted:  { e: "🖼️", t: "Visuel retiré" },
};
// sous-type des créations selon le niveau
const CREATED_BY_ENTREE = {
  "Maître": { e: "🆕", t: "Nouveau brief" },
  "Tâche":  { e: "✅", t: "Nouvelle tâche" },
  "Révision": { e: "🔄", t: "Nouvelle révision" },
};

function xmlEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}
function rfc822(iso) {
  const d = new Date(iso);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}

async function fetchEvents(env, limit, kind) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 60, 1), 200);
  // Backend maison : lecture DIRECTE de la base Postgres (aucun HTTP, donc aucun mur
  // à retraverser — c'était la cause du 502 quand la source était le PostgREST distant).
  if (typeof hasDb === "function" && hasDb()) {
    const params = [];
    let sql = "select id,at,ndeg,entree,client,projet,kind,statut_old,statut_new,resp_old,resp_new,summary from task_events";
    if (kind) { params.push(kind); sql += ` where kind = $${params.length}`; }
    sql += ` order by at desc limit ${lim}`;
    const { rows } = await pgQuery(sql, params);
    return rows;
  }
  // Repli historique : PostgREST distant (uniquement si DATABASE_URL absent).
  const url = (env && env.SUPA_URL) || SUPA_URL;
  const key = (env && env.SUPA_KEY) || SUPA_KEY;
  if (!url || !key) throw new Error("aucune source configurée (DATABASE_URL ou SUPA_URL/SUPA_KEY)");
  const sel = "id,at,ndeg,entree,client,projet,kind,statut_old,statut_new,resp_old,resp_new,summary";
  let q = `${url}/rest/v1/task_events?select=${sel}&order=at.desc&limit=${lim}`;
  if (kind) q += `&kind=eq.${encodeURIComponent(kind)}`;
  const r = await fetch(q, { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!r.ok) throw new Error("PostgREST distant " + r.status);
  return r.json();
}

function toItem(ev, origin) {
  const lab = (ev.kind === "created" && CREATED_BY_ENTREE[ev.entree]) || LABEL[ev.kind] || { e: "•", t: ev.kind };
  const projet = ev.projet || "(sans titre)";
  const link = `${origin}/#/tache/${encodeURIComponent(ev.ndeg || "")}`;
  const who = (ev.resp_new || ev.resp_old || "").trim();
  const detail = [ev.client, ev.summary, who && "→ " + who].filter(Boolean).join(" · ");
  return {
    id: String(ev.id),
    kind: ev.kind,
    emoji: lab.e,
    title: `${lab.e} ${lab.t} — ${ev.client ? ev.client + " · " : ""}${projet}`,
    detail: detail || projet,
    code: ev.ndeg || "",
    client: ev.client || "",
    projet,
    actor: who,
    link,
    when: ev.at,
  };
}

function renderRSS(items, origin, name) {
  const body = items.map(e => `    <item>
      <title>${xmlEsc(e.title)}</title>
      <link>${xmlEsc(e.link)}</link>
      <guid isPermaLink="false">${xmlEsc("evt:" + e.id)}</guid>
      <pubDate>${rfc822(e.when)}</pubDate>
      <category>${xmlEsc(e.kind)}</category>
      <description>${xmlEsc(e.detail)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEsc(name)} — Activité du pipe</title>
    <link>${xmlEsc(origin)}/</link>
    <atom:link href="${xmlEsc(origin)}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Journal temps réel : créations, statuts, réattributions, échéances, gels, clôtures — tracker créatif.</description>
    <language>fr</language>
    <lastBuildDate>${rfc822(items[0] && items[0].when)}</lastBuildDate>
${body}
  </channel>
</rss>
`;
}

function renderJSON(items, origin, name) {
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: `${name} — Activité du pipe`,
    home_page_url: origin + "/",
    feed_url: origin + "/activity.json",
    items: items.map(e => ({
      id: e.id,
      url: e.link,
      title: e.title,
      content_text: e.detail,
      date_published: new Date(e.when).toISOString(),
      tags: [e.kind, e.client].filter(Boolean),
      _radar: { code: e.code, kind: e.kind, client: e.client, projet: e.projet, owner: e.actor },
    })),
  }, null, 2);
}

// Gère une requête de flux (format "rss" | "json"). Auto-gère le token.
export async function handleFeed(context, format) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;

  // Flux PUBLIC par défaut. Verrouillage optionnel via la variable d'env FEED_TOKEN :
  //   /feed.xml?token=secret   et   /activity.json?token=secret
  const need = (env && env.FEED_TOKEN) || "";
  if (need) {
    const got = url.searchParams.get("token") || "";
    if (got !== need) return new Response("Forbidden — token de flux invalide (?token=…)", { status: 403 });
  }

  const name = (env && env.RADAR_NAME) || "Radar";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "60", 10) || 60, 200);
  const kind = url.searchParams.get("kind"); // filtre optionnel : created|status|reassigned|deadline|frozen|unfrozen|closed|reopened|deleted

  let rows;
  try { rows = await fetchEvents(env, limit, kind); }
  catch (e) { return new Response("Source indisponible : " + (e && e.message), { status: 502 }); }
  const items = rows.map(ev => toItem(ev, origin));

  if (format === "json") {
    return new Response(renderJSON(items, origin, name), {
      headers: { "content-type": "application/feed+json; charset=utf-8", "cache-control": "no-cache", "access-control-allow-origin": "*" },
    });
  }
  return new Response(renderRSS(items, origin, name), {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "no-cache", "access-control-allow-origin": "*" },
  });
}
