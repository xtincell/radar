// Remplace le binding KV Cloudflare `DASH_USERS` (email → mot de passe perso) par
// une table SQLite locale (node:sqlite, natif — aucune dépendance npm). Le fichier
// vit sous le volume Coolify monté (SQLITE_PATH), donc survit aux redéploiements.
// get/put restent async pour coller à la forme KV attendue par functions/_middleware.js
// et functions/profil.js (qui font déjà `try { await env.DASH_USERS.get(...) } catch {}`).
//
// La colonne `password` ne reçoit que des empreintes (functions/_password.js) :
// put et replace refusent toute autre valeur. Les anciennes valeurs en clair
// restent lisibles jusqu'à leur conversion (connexion ou server/hash-passwords.js).
"use strict";
import { DatabaseSync } from "node:sqlite";
import { isPasswordHash } from "../functions/_password.js";

function assertHash(value) {
  if (!isPasswordHash(value)) throw new Error("valeur refusée : seule une empreinte de mot de passe est stockée");
}

export function openKv(path) {
  const db = new DatabaseSync(path);
  // busy_timeout : le serveur et la conversion en masse peuvent écrire en même temps.
  // secure_delete : l'espace libéré par un remplacement est remis à zéro, l'ancien
  // clair ne survit pas dans le fichier.
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA secure_delete = ON;");
  db.exec(`CREATE TABLE IF NOT EXISTS dash_users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
  )`);
  const getStmt = db.prepare("SELECT password FROM dash_users WHERE email = ?");
  const putStmt = db.prepare(
    "INSERT INTO dash_users (email, password) VALUES (?, ?) " +
    "ON CONFLICT(email) DO UPDATE SET password = excluded.password"
  );
  const replaceStmt = db.prepare("UPDATE dash_users SET password = ? WHERE email = ? AND password = ?");
  const listStmt = db.prepare("SELECT email, password FROM dash_users ORDER BY email");

  return {
    async get(email) {
      const row = getStmt.get(email);
      return row ? row.password : undefined;
    },
    async put(email, password) {
      assertHash(password);
      putStmt.run(email, password);
    },
    // Remplacement conditionnel : n'écrit que si la valeur est encore `previous`,
    // pour ne jamais écraser un mot de passe changé entre-temps. Vrai si écrit.
    async replace(email, previous, next) {
      assertHash(next);
      return replaceStmt.run(next, email, previous).changes === 1;
    },
    // Réservés à la conversion en masse.
    entries() { return listStmt.all(); },
    vacuum() { db.exec("VACUUM"); },
    close() { db.close(); },
  };
}
