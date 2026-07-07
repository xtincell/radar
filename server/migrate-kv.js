// Script ponctuel — PAS lancé au boot du conteneur. Importe un export du KV
// Cloudflare `DASH_USERS` ({ "email": "mot-de-passe", ... }) dans SQLite.
// Usage : node server/migrate-kv.js ./kv-export.json
"use strict";
import { readFile } from "node:fs/promises";
import { openKv } from "./kv-sqlite.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node server/migrate-kv.js <export.json>");
  process.exit(1);
}

const entries = JSON.parse(await readFile(file, "utf8"));
const kv = openKv(process.env.SQLITE_PATH || "./dash-users.sqlite3");

let count = 0;
for (const [email, password] of Object.entries(entries)) {
  await kv.put(email.trim().toLowerCase(), password);
  count++;
}
console.log(`${count} entrée(s) importée(s).`);
