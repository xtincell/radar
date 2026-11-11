// Conversion en masse des mots de passe personnels encore en clair (table dash_users).
// PAS lancée au boot du conteneur : commande ponctuelle, à lancer APRÈS le
// déploiement de la version qui n'écrit plus que des empreintes.
//
// Une valeur sans préfixe de format EST le mot de passe : on la remplace par son
// empreinte (functions/_password.js), sans avoir à connaître le mot de passe.
// Idempotent : une empreinte n'est jamais touchée, relancer ne convertit rien de plus.
// Remplacement conditionnel ligne à ligne : le serveur peut rester en marche.
// Pour finir, VACUUM réécrit le fichier : ni les valeurs remplacées ni d'anciens
// mots de passe changés via /profil n'y subsistent.
//
// Usage : node server/hash-passwords.js           convertit (SQLITE_PATH, défaut ./dash-users.sqlite3)
//         node server/hash-passwords.js --check   n'écrit rien ; code 1 s'il reste du clair
// Codes de sortie : 0 aucun clair restant · 1 clair restant · 2 fichier introuvable.
"use strict";
import { existsSync } from "node:fs";
import { openKv } from "./kv-sqlite.js";
import { hashPassword, isPasswordHash, PASSWORD_PREFIX } from "../functions/_password.js";

const file = process.env.SQLITE_PATH || "./dash-users.sqlite3";
const checkOnly = process.argv.includes("--check");

// Un chemin erroné ne doit pas créer une base vide qui « ne contient aucun clair ».
if (!existsSync(file)) {
  console.error(`Fichier introuvable : ${file} (variable SQLITE_PATH).`);
  process.exit(2);
}

function kind(value) {
  if (!value) return "vide";                        // aucun mot de passe personnel
  if (isPasswordHash(value)) return "empreinte";
  if (value.startsWith(PASSWORD_PREFIX)) return "illisible";
  return "clair";
}
function census(rows) {
  const n = { vide: 0, empreinte: 0, illisible: 0, clair: 0 };
  for (const r of rows) n[kind(r.password)]++;
  return n;
}

const kv = openKv(file);
try {
  const rows = kv.entries();
  let converted = 0, changed = 0;
  if (!checkOnly) {
    for (const { email, password } of rows) {
      if (kind(password) !== "clair") continue;
      // Faux : la valeur a changé depuis la lecture (nouveau mot de passe via /profil).
      if (await kv.replace(email, password, await hashPassword(password))) converted++;
      else changed++;
    }
    kv.vacuum();
  }
  const after = kv.entries();
  const n = census(after);
  const verb = checkOnly ? "contrôle" : `${converted} convertie(s)`;
  console.log(`${file} : ${after.length} entrée(s) — ${verb}, ${n.empreinte} sous empreinte, ` +
    `${n.clair} en clair, ${n.vide} vide(s), ${n.illisible} illisible(s)` +
    (changed ? `, ${changed} modifiée(s) pendant la conversion` : "") + ".");
  if (n.illisible) {
    // Préfixe présent mais format illisible : jamais relu comme du clair, la
    // connexion personnelle de ces comptes est refusée. À redéfinir via /profil.
    console.error("Valeurs illisibles pour : " + after.filter(r => kind(r.password) === "illisible").map(r => r.email).join(", "));
  }
  process.exitCode = n.clair ? 1 : 0;
} finally {
  kv.close();
}
