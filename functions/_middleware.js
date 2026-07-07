// Mur d'authentification — RADAR
// Connexion : email d'équipe (voir l'allowlist ci-dessous, source functions/_authz.js)
// + le mot de passe partagé (variable d'env DASH_PASSWORD). HTTP Basic Auth : le
// navigateur demande « nom d'utilisateur » (= ton email) et « mot de passe ».
//
// SESSION PERSISTANTE (anti « retaper le mot de passe à chaque fois ») :
//   Après une première connexion réussie (Basic Auth), on pose un cookie signé
//   (HMAC-SHA256) « radar_sess » valable 30 jours, renouvelé automatiquement tant
//   que tu reviens (fenêtre glissante). Tant que ce cookie est valide, le mur te
//   laisse passer SANS redemander le mot de passe — même après redémarrage du
//   navigateur (ce que le Basic Auth seul ne garantit pas). Le cookie est
//   HttpOnly + SameSite=Lax (+ Secure en https) : jamais lisible par le JS de la page.
//
// Variables d'environnement utilisées :
//   DASH_PASSWORD       → mot de passe partagé (obligatoire pour activer le mur)
//   DASH_ALLOWLIST      → emails autorisés en plus de l'allowlist (CSV, optionnel)
//   DASH_COOKIE_SECRET  → clé de signature du cookie de session (optionnel : à défaut
//                         on signe avec DASH_PASSWORD, donc changer le mot de passe
//                         partagé invalide toutes les sessions existantes).
//
// Gérer les accès :
//   - éditer la config d'autorité (RADAR_AUTHZ_JSON / RADAR_ADMIN_EMAIL, voir functions/_authz.js), OU
//   - ajouter des emails sans toucher à la config : variable d'env DASH_ALLOWLIST="a@x.com,b@y.com"
//   - changer le mot de passe : variable d'env DASH_PASSWORD
//   - se déconnecter / repartir de zéro : visiter /logout (efface le cookie de session).
//   - désactiver le mur : supprime ce fichier, OU retire la variable DASH_PASSWORD.
//
// Allowlist + niveaux d'autorité = source unique dans functions/_authz.js.
// (Édite RADAR_AUTHZ_JSON / RADAR_ADMIN_EMAIL là-bas pour gérer les accès ; ici on ne fait que l'appliquer.)
import { ALLOW, identityFor } from "./_authz.js";

const COOKIE = "radar_sess";

// Évaluations RH (/rh/*) : réservées au rôle `owner` (Direction Créa / Admin RADAR).
// Les superviseurs voient les TÂCHES, jamais ces fiches (santé, trésorerie, grief, politique).
// Fail-closed : tout rôle non-owner — y compris email inconnu (member par défaut) — reçoit 403.
function rhDenied(path, email) {
  if (path === "/rh" || path.startsWith("/rh/")) {
    if (identityFor(email).role !== "owner") {
      return new Response("403 — Réservé à l'administrateur du RADAR (rôle owner).", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" },
      });
    }
  }
  return null;
}
const MAX_AGE = 60 * 60 * 24 * 30;    // 30 jours
const REFRESH_BELOW = MAX_AGE / 2;    // on renouvelle le cookie quand il reste moins de la moitié

function unauthorized(env) {
  const name = (env && env.RADAR_NAME) || "Radar";
  return new Response("Connecte-toi avec ton email d'équipe et le mot de passe partagé.", {
    status: 401,
    headers: {
      // Note : un tiret cadratin (—) ici ferait échouer new Response() sous Node/undici
      // (WWW-Authenticate doit être un ByteString Latin1) alors que ça passait sous Cloudflare.
      "WWW-Authenticate": `Basic realm="${name} - email d'équipe", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}

// Comparaison à temps constant pour éviter les attaques temporelles.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---- helpers cookie signé (HMAC-SHA256, base64url) ---- */
const enc = new TextEncoder();
const dec = new TextDecoder();
function b64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmac(data, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}
async function makeToken(email, secret) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const data = `${email}|${exp}`;
  const sig = await hmac(data, secret);
  return b64url(enc.encode(data)) + "." + sig;
}
async function readToken(token, secret) {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  let data;
  try { data = dec.decode(unb64url(token.slice(0, dot))); } catch { return null; }
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, await hmac(data, secret))) return null;   // signature invalide
  const bar = data.indexOf("|");
  if (bar < 0) return null;
  const email = data.slice(0, bar);
  const exp = parseInt(data.slice(bar + 1), 10);
  if (!exp || Date.now() / 1000 > exp) return null;             // expiré
  return { email, exp };
}
function cookieFrom(request) {
  const c = request.headers.get("Cookie") || "";
  for (const part of c.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
  }
  return "";
}
function withSession(res, token, secure) {
  const r = new Response(res.body, res);
  r.headers.append("Set-Cookie",
    `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return r;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const secure = url.protocol === "https:";

  // Flux d'activité (RSS/JSON) : destinés aux services externes (machines), ils
  // ne peuvent pas faire le Basic Auth navigateur. On les laisse traverser le mur
  // (garde optionnelle via FEED_TOKEN, gérée dans _feed.js).
  // /jour.html : todo du jour du département, PUBLIC par décision (affichage sans
  // connexion). 100% autonome (n'utilise aucun asset derrière le mur).
  if (path === "/feed.xml" || path === "/activity.json" ||
      path === "/jour.html" || path === "/jour" || path === "/jour.json") return next();

  // API FULL-ACCESS (machine : serveur MCP / Claude / Dan). Une clé porteuse valide
  // franchit le mur ET fait sauter le scope private_to (voir pgrest : context.data.fullAccess).
  // La clé vit en env (RADAR_API_KEY), jamais dans le repo.
  const fullKey = env.RADAR_API_KEY;
  if (fullKey) {
    const az = request.headers.get("Authorization") || "";
    if (az === "Bearer " + fullKey || request.headers.get("X-Radar-Key") === fullKey) {
      context.data = context.data || {};
      context.data.email = "service@radar";
      context.data.fullAccess = true;
      return next();
    }
  }

  // Déconnexion : efface le cookie de session et renvoie vers l'accueil.
  // (Le navigateur peut encore avoir le Basic Auth en cache pour la session courante ;
  //  fermer/rouvrir le navigateur termine alors complètement la session.)
  if (path === "/logout") {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Si le mot de passe n'est pas configuré, on ne bloque pas (évite de se verrouiller dehors).
  const password = env.DASH_PASSWORD;
  if (!password) return next();

  // Allowlist = liste par défaut (membres Slack) + extras éventuels via DASH_ALLOWLIST.
  const extra = (env.DASH_ALLOWLIST || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const allow = new Set([...ALLOW.map(s => s.toLowerCase()), ...extra]);

  // Clé de signature du cookie : dédiée si fournie, sinon le mot de passe partagé.
  const cookieSecret = env.DASH_COOKIE_SECRET || password;

  // 1) Session déjà ouverte ? On vérifie le cookie signé AVANT de redemander quoi que ce soit.
  const tok = cookieFrom(request);
  if (tok) {
    const sess = await readToken(tok, cookieSecret);
    if (sess && allow.has(sess.email)) {
      context.data = context.data || {};
      context.data.email = sess.email;                  // dispo pour les routes (ex. /profil)
      const denied = rhDenied(path, sess.email);        // gate owner-only sur /rh/*
      if (denied) return denied;
      const remaining = sess.exp - Math.floor(Date.now() / 1000);
      if (remaining < REFRESH_BELOW) {                  // fenêtre glissante : on prolonge
        return withSession(await next(), await makeToken(sess.email, cookieSecret), secure);
      }
      return next();
    }
    // cookie présent mais invalide/expiré → on retombe sur le Basic Auth ci-dessous.
  }

  // 2) Pas (ou plus) de session : Basic Auth classique.
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return unauthorized(env);

  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized(env);
  }
  const idx = decoded.indexOf(":");
  const email = (idx >= 0 ? decoded.slice(0, idx) : "").trim().toLowerCase();
  const pass = idx >= 0 ? decoded.slice(idx + 1) : "";

  // Mot de passe attendu : celui défini par l'utilisateur (KV) s'il existe, sinon le partagé.
  let expected = password;
  if (env.DASH_USERS) {
    try { const perso = await env.DASH_USERS.get(email); if (perso) expected = perso; } catch {}
  }

  // Autorisé si : email dans l'allowlist ET mot de passe correct → on ouvre une session.
  if (allow.has(email) && safeEqual(pass, expected)) {
    context.data = context.data || {};
    context.data.email = email;
    const denied = rhDenied(path, email);               // gate owner-only sur /rh/*
    if (denied) return withSession(denied, await makeToken(email, cookieSecret), secure);
    return withSession(await next(), await makeToken(email, cookieSecret), secure);
  }
  return unauthorized(env);
}
