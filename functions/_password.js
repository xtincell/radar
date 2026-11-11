// Empreintes des mots de passe personnels (/profil, mur d'authentification).
//
// Format auto-décrit et versionné, une seule chaîne par compte :
//   pbkdf2-sha256$<itérations>$<sel base64>$<empreinte base64>
//
// Choix de la primitive : PBKDF2-HMAC-SHA256 via WebCrypto (crypto.subtle), seule
// fonction lente disponible à la fois dans le runtime réel (Node 22, server/index.js)
// et dans le runtime d'origine de ces fonctions (Cloudflare Pages) ; scrypt n'existe
// pas dans WebCrypto. Le calcul tourne hors de la boucle d'événements sous Node.
//
// Paramètres : 600 000 itérations (recommandation OWASP pour PBKDF2-HMAC-SHA256,
// ~0,1 s par vérification sur le serveur), sel aléatoire de 16 octets, empreinte
// de 32 octets. Une session dure 30 jours : le coût ne se paie qu'à la connexion.
// Limite connue : Cloudflare Workers plafonne PBKDF2 à 100 000 itérations ; une
// empreinte à 600 000 n'y serait pas vérifiable. Le runtime déployé est Node.
//
// Toute valeur sans le préfixe « pbkdf2-sha256$ » est un ancien mot de passe en
// clair : accepté une fois, puis remplacé (voir _middleware.js). Une valeur qui
// porte le préfixe mais ne se lit pas n'est jamais relue comme du clair : refus.
"use strict";

export const PASSWORD_SCHEME = "pbkdf2-sha256";
export const PASSWORD_PREFIX = PASSWORD_SCHEME + "$";
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_ITERATIONS = 10_000_000;   // garde contre une valeur stockée aberrante
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const enc = new TextEncoder();

function toB64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s) {
  if (!B64.test(s) || s.length % 4) return null;
  try { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); } catch { return null; }
}

// Comparaison d'octets en temps constant (longueurs fixées par le format).
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function derive(password, salt, iterations, length) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, length * 8);
  return new Uint8Array(bits);
}

function parseHash(value) {
  if (typeof value !== "string" || !value.startsWith(PASSWORD_PREFIX)) return null;
  const parts = value.split("$");
  if (parts.length !== 4 || !/^[1-9]\d{0,7}$/.test(parts[1])) return null;
  const iterations = Number(parts[1]);
  const salt = fromB64(parts[2]);
  const hash = fromB64(parts[3]);
  if (iterations > MAX_ITERATIONS || !salt || !hash || salt.length < 8 || hash.length < 16 || hash.length > 64) return null;
  return { iterations, salt, hash };
}

// Vrai seulement pour une empreinte lisible dans le format ci-dessus.
export function isPasswordHash(value) {
  return parseHash(value) !== null;
}

export async function hashPassword(password) {
  if (typeof password !== "string" || !password) throw new TypeError("mot de passe vide");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS, HASH_BYTES);
  return `${PASSWORD_SCHEME}$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

// Égalité de deux secrets en temps constant, longueur comprise : chacun est
// condensé (SHA-256 de ses unités UTF-16, sans perte) avant de comparer 32 octets.
// Sert au mot de passe partagé et aux anciens mots de passe en clair.
export async function equalSecrets(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const digest = async s => {
    const units = new Uint16Array(s.length);
    for (let i = 0; i < s.length; i++) units[i] = s.charCodeAt(i);
    return new Uint8Array(await crypto.subtle.digest("SHA-256", units));
  };
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  return equalBytes(x, y);
}

// { ok, rehash } — rehash : la valeur stockée est un ancien clair ou une empreinte
// aux paramètres plus faibles que les actuels ; à remplacer après ce succès.
export async function verifyPassword(candidate, stored) {
  const refused = { ok: false, rehash: false };
  if (typeof candidate !== "string" || !candidate || typeof stored !== "string" || !stored) return refused;
  try {
    if (!stored.startsWith(PASSWORD_PREFIX)) {
      const ok = await equalSecrets(candidate, stored);
      return { ok, rehash: ok };
    }
    const p = parseHash(stored);
    if (!p) return refused;
    const ok = equalBytes(await derive(candidate, p.salt, p.iterations, p.hash.length), p.hash);
    const weaker = p.iterations < PBKDF2_ITERATIONS || p.salt.length < SALT_BYTES || p.hash.length < HASH_BYTES;
    return { ok, rehash: ok && weaker };
  } catch {
    return refused;
  }
}
