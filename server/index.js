// Point d'entrée Node — remplace le runtime Cloudflare Pages Functions ET le
// backend Supabase (désormais : Postgres Coolify via server/pgrest.js).
// La middleware (functions/_middleware.js) tourne sur CHAQUE requête ; `dispatch()`
// joue le routeur Pages + le callback next(), partageant le même `context`
// (context.data.email posé par la middleware reste visible partout).
//   • /rest/v1/*   → mini-PostgREST maison (pg) — données de l'app (derrière le mur)
//   • /jour.json   → todo du jour PUBLIC (colonnes limitées, non-private)
//   • /token /profil /feed.xml /activity.json → fonctions inchangées
"use strict";
import http from "node:http";
import { toWebRequest, writeWebResponse } from "./request-adapter.js";
import { serveStatic } from "./static.js";
import { openKv } from "./kv-sqlite.js";
import { initDb, handleRest, query as pgQuery, hasDb } from "./pgrest.js";
import { handleVisuelUpload, serveVisuel, handleVisuelDelete, purgeOrphans } from "./visuels.js";
import { handleIngest } from "./ingest.js";
import * as middleware from "../functions/_middleware.js";
import * as token from "../functions/token.js";
import * as profil from "../functions/profil.js";
import * as feedXml from "../functions/feed.xml.js";
import * as activityJson from "../functions/activity.json.js";

const PORT = Number(process.env.PORT) || 3000;
const SQLITE_PATH = process.env.SQLITE_PATH || "./dash-users.sqlite3";

const env = {
  DASH_PASSWORD: process.env.DASH_PASSWORD,
  DASH_ALLOWLIST: process.env.DASH_ALLOWLIST,
  DASH_COOKIE_SECRET: process.env.DASH_COOKIE_SECRET,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  FEED_TOKEN: process.env.FEED_TOKEN,
  RADAR_API_KEY: process.env.RADAR_API_KEY, // clé porteuse full-access (MCP/Claude/Dan)
  DASH_USERS: openKv(SQLITE_PATH), // mots de passe perso par utilisateur (self-service /profil)
};

// /jour.json — todo du jour PUBLIC, source same-origin de jour.html (qui, hors
// Supabase, ne peut plus taper une base externe). Colonnes limitées + non-private.
const JOUR_COLS = ["ndeg", "client", "marque", "projet", "livrables", "statut", "deadline", "responsable", "entree", "prio"];
async function jourJson() {
  const head = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };
  if (!hasDb()) return new Response("[]", { headers: head });
  try {
    await initDb();
    const { rows } = await pgQuery(
      `select ${JOUR_COLS.join(",")} from briefs where (private_to is null or private_to = '') order by deadline asc limit 5000`, []);
    return new Response(JSON.stringify(rows), { headers: head });
  } catch (e) {
    console.error("[jour.json]", e && e.message);
    return new Response("[]", { headers: head });
  }
}

async function dispatch(context) {
  const { pathname } = new URL(context.request.url);
  const method = context.request.method;

  if (pathname.startsWith("/rest/v1/")) return handleRest(context);
  if (pathname === "/jour.json") return jourJson();
  // Visuels de livrables — derrière le mur (pas dans la liste bypass de la middleware).
  if (pathname === "/ingest" && method === "POST") return handleIngest(context);
  if (pathname === "/visuels" && method === "POST") return handleVisuelUpload(context);
  if (pathname.startsWith("/visuels/") && method === "GET") return serveVisuel(context);
  if (pathname.startsWith("/visuels/") && method === "DELETE") return handleVisuelDelete(context);
  if (pathname === "/token" && method === "GET") return token.onRequestGet(context);
  if (pathname === "/profil" && method === "GET") return profil.onRequestGet(context);
  if (pathname === "/profil" && method === "POST") return profil.onRequestPost(context);
  if (pathname === "/feed.xml" && method === "GET") return feedXml.onRequestGet(context);
  if (pathname === "/activity.json" && method === "GET") return activityJson.onRequestGet(context);

  return serveStatic(context);
}

const server = http.createServer(async (nodeReq, nodeRes) => {
  try {
    const origin = `http://${nodeReq.headers.host || `localhost:${PORT}`}`;
    const request = toWebRequest(nodeReq, origin);
    const context = { request, env, data: {} };
    context.next = () => dispatch(context);
    const response = await middleware.onRequest(context);
    await writeWebResponse(response, nodeRes);
  } catch (err) {
    console.error(err);
    if (!nodeRes.headersSent) nodeRes.statusCode = 500;
    nodeRes.end("500 — erreur serveur");
  }
});

// Prépare la base (schéma idempotent + seed depuis INDEX.csv si vide) au démarrage.
initDb().then((ok) => {
  console.log(ok ? "[radar] Postgres prêt (données de l'app)" : "[radar] pas de DATABASE_URL — repli statique/CSV");
  if (ok) purgeOrphans().catch((e) => console.warn("[visuels] purge orphelins:", e && e.message));
})
  .catch((e) => console.error("[radar] initDb:", e && e.message));
const RADAR_NAME = process.env.RADAR_NAME || "Radar";
server.listen(PORT, () => console.log(`${RADAR_NAME} — écoute sur :${PORT}`));
