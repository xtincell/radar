// ============================================================
//  RADAR — visuels de livrables (/visuels)
//  Upload + service + suppression d'images attachées aux briefs.
//  Métadonnées en base (table brief_assets, lecture via /rest/v1),
//  binaires sur le volume persistant (VISUELS_DIR, défaut /data/visuels).
//  Création/suppression passent EXCLUSIVEMENT par ici : le fichier disque
//  vit et meurt avec la ligne (pgrest refuse POST/DELETE REST sur la table).
//  La compression/redimensionnement est faite côté client (canvas → WebP) ;
//  le serveur revalide MIME + magic bytes + taille, et nomme lui-même le fichier.
// ============================================================
"use strict";
import { mkdir, writeFile, unlink, open, access, constants, readdir, stat } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { query as pgQuery, emitEvent, hasDb, initDb } from "./pgrest.js";
import { identityFor } from "../functions/_authz.js";

const MAX_BODY = 4 * 1024 * 1024;   // corps JSON (base64 ≈ +33%)
const MAX_IMAGE = 2 * 1024 * 1024;  // binaire décodé
const QUOTA_BYTES = (Number(process.env.VISUELS_QUOTA_MB) || 512) * 1024 * 1024; // plafond global du volume
const EXT = { "image/webp": ".webp", "image/png": ".png", "image/jpeg": ".jpg" };
const MIME_BY_EXT = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg" };
// noms générés par nous uniquement (uuid + extension connue) — pas de traversal possible
const SAFE_NAME = /^[0-9a-f-]{36}\.(webp|png|jpg)$/;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...secu() },
});
function secu() {
  return { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "SAMEORIGIN" };
}

// ---- répertoire de stockage : env, sinon /data (volume Docker), sinon ./data ----
let _dir = null;
async function visuelsDir() {
  if (_dir) return _dir;
  const candidates = process.env.VISUELS_DIR
    ? [process.env.VISUELS_DIR]
    : ["/data/visuels", path.resolve("./data/visuels")];
  for (const d of candidates) {
    try {
      await mkdir(d, { recursive: true });
      await access(d, constants.W_OK);
      _dir = d;
      return _dir;
    } catch {}
  }
  throw new Error("aucun répertoire de visuels inscriptible (VISUELS_DIR ?)");
}

// ---- lecture bornée du corps (request-adapter streame sans plafond) ----------
async function readBodyCapped(request, cap) {
  const reader = request.body && request.body.getReader ? request.body.getReader() : null;
  if (!reader) return null;
  const chunks = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) { try { await reader.cancel(); } catch {} return { tooBig: true }; }
    chunks.push(value);
  }
  return { buf: Buffer.concat(chunks) };
}

function sniffMime(buf) {
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

// ---- purge des orphelins (au boot) -------------------------------------------
// Un crash entre l'écriture du fichier et l'INSERT laisse un binaire sans ligne.
// On supprime les fichiers inconnus de la base ET plus vieux que 24 h (garde
// anti-course avec un upload en cours). Jamais l'inverse : une ligne sans
// fichier s'affiche cassée et se corrige à la main, on ne détruit pas de la donnée.
export async function purgeOrphans() {
  if (!hasDb()) return 0;
  await initDb();
  let dir;
  try { dir = await visuelsDir(); } catch { return 0; }
  const { rows } = await pgQuery("select filename from brief_assets", []);
  const known = new Set(rows.map(r => r.filename));
  let purged = 0;
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  for (const f of await readdir(dir).catch(() => [])) {
    if (!SAFE_NAME.test(f) || known.has(f)) continue;
    try {
      const s = await stat(path.join(dir, f));
      if (s.mtimeMs < dayAgo) { await unlink(path.join(dir, f)); purged++; }
    } catch {}
  }
  if (purged) console.log(`[visuels] ${purged} orphelin(s) purgé(s)`);
  return purged;
}

// ---- POST /visuels — corps JSON { ndeg, caption?, data: dataURL base64 } -----
export async function handleVisuelUpload(context) {
  if (!hasDb()) return json({ message: "base non configurée" }, 503);
  await initDb();
  const email = (context.data && context.data.email) || "";

  const body = await readBodyCapped(context.request, MAX_BODY);
  if (!body) return json({ message: "corps attendu" }, 400);
  if (body.tooBig) return json({ message: "corps trop volumineux (max 4 Mo)" }, 413);
  let payload;
  try { payload = JSON.parse(body.buf.toString("utf8")); } catch { return json({ message: "corps JSON attendu" }, 400); }
  const ndeg = String(payload.ndeg || "").trim();
  const caption = String(payload.caption || "").trim().slice(0, 300);
  if (!ndeg) return json({ message: "ndeg requis" }, 400);

  const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(payload.data || ""));
  if (!m) return json({ message: "data attendu en data-URL image/webp|png|jpeg base64" }, 415);
  const declared = m[1];
  let bin;
  try { bin = Buffer.from(m[2].replace(/\s+/g, ""), "base64"); } catch { return json({ message: "base64 invalide" }, 400); }
  if (!bin.length) return json({ message: "image vide" }, 400);
  if (bin.length > MAX_IMAGE) return json({ message: "image trop lourde (max 2 Mo après compression)" }, 413);
  const sniffed = sniffMime(bin);
  if (!sniffed || sniffed !== declared) return json({ message: "contenu image invalide (signature ≠ type déclaré)" }, 415);

  // brief cible : doit exister. Un brief confidentiel accepte un visuel de la
  // personne concernée uniquement — et les métadonnées restent scopées côté
  // REST (jointure private_to dans pgrest), donc invisibles aux autres.
  const { rows } = await pgQuery("select id, client, projet, entree, private_to from briefs where ndeg = $1 limit 1", [ndeg]);
  if (!rows.length) return json({ message: "brief inconnu: " + ndeg }, 404);
  const b = rows[0];
  const priv = String(b.private_to || "").trim();
  if (priv && priv !== (identityFor(email).person || "") && !(context.data && context.data.fullAccess))
    return json({ message: "brief confidentiel" }, 403);

  // quota global du volume (métadonnées font foi ; la purge d'orphelins réaligne le disque)
  const { rows: q } = await pgQuery("select coalesce(sum(bytes),0)::bigint as used from brief_assets", []);
  if (Number(q[0].used) + bin.length > QUOTA_BYTES)
    return json({ message: "quota de stockage des visuels atteint — supprimez d'anciens visuels" }, 413);

  const dir = await visuelsDir();
  const filename = crypto.randomUUID() + EXT[declared];
  await writeFile(path.join(dir, filename), bin);
  let row;
  try {
    const ins = await pgQuery(
      `insert into brief_assets (ndeg, client, projet, filename, mime, bytes, caption, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [ndeg, b.client, b.projet, filename, declared, bin.length, caption || null, email]);
    row = ins.rows[0];
  } catch (e) {
    await unlink(path.join(dir, filename)).catch(() => {});
    throw e;
  }
  await emitEvent({ query: pgQuery }, {
    ndeg, entree: b.entree, client: b.client, projet: b.projet, kind: "asset",
    resp_new: identityFor(email).person || email, summary: "Visuel ajouté" + (caption ? " : " + caption : ""),
  });
  return json(row, 201);
}

// ---- GET /visuels/<filename> — service des binaires (cache fort) ------------
export async function serveVisuel(context) {
  const { pathname } = new URL(context.request.url);
  const filename = decodeURIComponent(pathname.replace(/^\/visuels\//, ""));
  if (!SAFE_NAME.test(filename)) return new Response("404 — introuvable", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...secu() } });
  const dir = await visuelsDir();
  try {
    const handle = await open(path.join(dir, filename), "r");
    return new Response(handle.readableWebStream(), {
      status: 200,
      headers: {
        "Content-Type": MIME_BY_EXT[path.extname(filename)] || "application/octet-stream",
        // nom unique par contenu (uuid) → cache agressif sans ?v=
        "Cache-Control": "public, max-age=31536000, immutable",
        ...secu(),
      },
    });
  } catch {
    return new Response("404 — introuvable", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...secu() } });
  }
}

// ---- DELETE /visuels/<id> — auteur, owner ou supervisor ----------------------
export async function handleVisuelDelete(context) {
  if (!hasDb()) return json({ message: "base non configurée" }, 503);
  await initDb();
  const email = (context.data && context.data.email) || "";
  const { pathname } = new URL(context.request.url);
  const id = Number(pathname.replace(/^\/visuels\//, ""));
  if (!Number.isFinite(id)) return json({ message: "id invalide" }, 400);

  const { rows } = await pgQuery("select * from brief_assets where id = $1", [id]);
  if (!rows.length) return json({ message: "visuel inconnu" }, 404);
  const a = rows[0];
  const ident = identityFor(email);
  const allowed = (context.data && context.data.fullAccess) || a.created_by === email ||
    ident.role === "owner" || ident.role === "supervisor";
  if (!allowed) return json({ message: "suppression réservée à l'auteur ou à un responsable" }, 403);

  await pgQuery("delete from brief_assets where id = $1", [id]);
  const dir = await visuelsDir();
  await unlink(path.join(dir, a.filename)).catch(() => {}); // tolérant si déjà absent
  await emitEvent({ query: pgQuery }, {
    ndeg: a.ndeg, client: a.client, projet: a.projet, kind: "asset_deleted",
    resp_new: ident.person || email, summary: "Visuel retiré",
  });
  return json({ ok: true });
}
