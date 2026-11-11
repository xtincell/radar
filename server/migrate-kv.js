// Script ponctuel — PAS lancé au boot du conteneur. Importe un export du KV
// Cloudflare `DASH_USERS` ({ "email": "mot-de-passe", ... }) dans SQLite.
// Les valeurs de l'export sont en clair : seule leur empreinte est écrite
// (functions/_password.js). Une empreinte déjà présente dans l'export est
// reprise telle quelle ; une valeur vide ou illisible est ignorée.
// Usage : node server/migrate-kv.js ./kv-export.json
"use strict";
import { readFile } from "node:fs/promises";
import { openKv } from "./kv-sqlite.js";
import { hashPassword, isPasswordHash, PASSWORD_PREFIX } from "../functions/_password.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node server/migrate-kv.js <export.json>");
  process.exit(1);
}

const entries = JSON.parse(await readFile(file, "utf8"));
const kv = openKv(process.env.SQLITE_PATH || "./dash-users.sqlite3");

let count = 0, skipped = 0;
for (const [email, raw] of Object.entries(entries)) {
  const value = raw == null ? "" : String(raw);
  if (!value || (value.startsWith(PASSWORD_PREFIX) && !isPasswordHash(value))) { skipped++; continue; }
  await kv.put(email.trim().toLowerCase(), isPasswordHash(value) ? value : await hashPassword(value));
  count++;
}
kv.close();
console.log(`${count} entrée(s) importée(s) sous empreinte` + (skipped ? `, ${skipped} ignorée(s) (vide ou illisible)` : "") + ".");
