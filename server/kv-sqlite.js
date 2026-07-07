// Remplace le binding KV Cloudflare `DASH_USERS` (email → mot de passe perso) par
// une table SQLite locale (node:sqlite, natif — aucune dépendance npm). Le fichier
// vit sous le volume Coolify monté (SQLITE_PATH), donc survit aux redéploiements.
// get/put restent async pour coller à la forme KV attendue par functions/_middleware.js
// et functions/profil.js (qui font déjà `try { await env.DASH_USERS.get(...) } catch {}`).
"use strict";
import { DatabaseSync } from "node:sqlite";

export function openKv(path) {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS dash_users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
  )`);
  const getStmt = db.prepare("SELECT password FROM dash_users WHERE email = ?");
  const putStmt = db.prepare(
    "INSERT INTO dash_users (email, password) VALUES (?, ?) " +
    "ON CONFLICT(email) DO UPDATE SET password = excluded.password"
  );

  return {
    async get(email) {
      const row = getStmt.get(email);
      return row ? row.password : undefined;
    },
    async put(email, password) {
      putStmt.run(email, password);
    },
  };
}
