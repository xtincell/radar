// Sert briefs/ (site statique) en répliquant en dur les deux fichiers déclaratifs
// de Cloudflare Pages : _redirects (une seule règle : / -> /radar) et _headers
// (en-têtes de sécurité + no-cache sur les fichiers partagés JS/CSS/CSV).
"use strict";
import { open, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRIEFS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "briefs");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const NO_CACHE_PATHS = new Set([
  "/supa.js", "/ui.js", "/chrome.js", "/export-csv.js", "/colors_and_type.css", "/INDEX.csv",
]);

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
  };
}

async function resolveFile(pathname) {
  // Cas particulier étroit : la seule cible extensionless du site (_redirects -> /radar).
  // Rien d'autre ne dépend d'une résolution d'URL "propre" généralisée.
  const candidates = pathname === "/radar" ? ["/radar.html"] : [pathname];
  for (const candidate of candidates) {
    const rel = decodeURIComponent(candidate).replace(/^\/+/, "");
    const abs = path.normalize(path.join(BRIEFS_DIR, rel));
    if (!abs.startsWith(BRIEFS_DIR)) continue; // anti-traversal
    try {
      const s = await stat(abs);
      if (s.isFile()) return abs;
    } catch {}
  }
  return null;
}

export async function serveStatic(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/radar", ...securityHeaders() },
    });
  }

  const abs = await resolveFile(pathname);
  if (!abs) {
    return new Response("404 — introuvable", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders() },
    });
  }

  const ext = path.extname(abs).toLowerCase();
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    ...securityHeaders(),
  };
  if (NO_CACHE_PATHS.has(pathname)) headers["Cache-Control"] = "no-cache";

  const handle = await open(abs, "r");
  const stream = handle.readableWebStream();
  return new Response(stream, { status: 200, headers });
}
