// ============================================================
//  RADAR — ingest des retours clients (/ingest)
//  La direction colle un retour client en texte libre ; un LLM local
//  (Ollama : OLLAMA_URL, défaut http://127.0.0.1:11434, modèle OLLAMA_MODEL)
//  le transforme en tâches STRUCTURÉES : révision rattachée à un projet
//  existant quand le retour s'y rapporte, nouveau projet sinon.
//  Garde-fous :
//   • le LLM ne décide JAMAIS des codes : les ndeg (PREFIX-NNN / PARENT.RN)
//     sont générés ici, d'après l'existant — mêmes règles que ticket.html ;
//   • tout entre en statut « Reçu » avec brief_etat « déduit » → la file
//     « À valider » existante fait la revue humaine (rien n'est validé seul) ;
//   • Ollama injoignable ou réponse illisible → repli sans perte : UNE entrée
//     « Retour client à trier » portant le texte brut (fallback:true).
// ============================================================
"use strict";
import { query as pgQuery, emitEvent, hasDb, initDb } from "./pgrest.js";
import { identityFor } from "../functions/_authz.js";

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const MAX_TEXT = 64 * 1024;   // un retour client, pas un roman
const TIMEOUT_MS = 90_000;    // les petits modèles locaux prennent leur temps

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---- contexte : l'existant sert de référentiel au modèle --------------------
async function loadContext() {
  const { rows: masters } = await pgQuery(
    `select ndeg, client, marque, projet, statut from briefs
     where entree = 'Maître' and coalesce(private_to,'') = ''
       and coalesce(statut,'') not in ('Bouclé','Archivé','Frozen','Gelé')
     order by ndeg desc limit 200`, []);
  const { rows: all } = await pgQuery("select ndeg, client, parent, entree from briefs", []);
  return { masters, all };
}

// ---- génération de codes (mêmes conventions que ticket.html) ----------------
const prefixOf = (code) => { const m = String(code || "").match(/^([A-Za-zÀ-ÿ]+)-(\d+)/); return m ? m[1].toUpperCase() : null; };
function clientPrefix(all, client) {
  const tally = {};
  for (const r of all) {
    if (r.client !== client) continue;
    const p = prefixOf(r.ndeg);
    if (p) tally[p] = (tally[p] || 0) + 1;
  }
  const best = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  if (best) return best;
  const letters = String(client || "").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "DIV");
}
function nextProjectCode(all, taken, prefix) {
  let max = 0;
  for (const r of all) { if (prefixOf(r.ndeg) === prefix) { const n = +(String(r.ndeg).match(/-(\d+)/) || [])[1] || 0; if (n > max) max = n; } }
  for (const c of taken) { if (prefixOf(c) === prefix) { const n = +(String(c).match(/-(\d+)/) || [])[1] || 0; if (n > max) max = n; } }
  return prefix + "-" + String(max + 1).padStart(3, "0");
}
function nextRevisionCode(all, taken, parent) {
  let max = 0;
  const scan = (code, par) => {
    if (par === parent || String(code).indexOf(parent + ".R") === 0) {
      const n = +(String(code).match(/\.R(\d+)$/) || [])[1] || 0; if (n > max) max = n;
    }
  };
  for (const r of all) scan(r.ndeg, r.parent);
  for (const c of taken) scan(c, null);
  return parent + ".R" + (max + 1);
}

// ---- appel Ollama ------------------------------------------------------------
function buildPrompt(text, clientHint, masters) {
  const portefeuille = masters.map(m => `${m.ndeg} · ${m.client}${m.marque ? " / " + m.marque : ""} · ${m.projet}`).join("\n");
  const system = `Tu es l'assistant d'ingestion du Radar, le tracker d'une agence créative.
On te donne un RETOUR CLIENT en texte libre. Découpe-le en tâches actionnables.
Réponds UNIQUEMENT en JSON, de la forme :
{"items":[{"action":"revision"|"nouveau","parent":"<ndeg du projet existant si action=revision>","client":"<nom du client>","marque":"","projet":"<intitulé court et actionnable>","type":"<Création KV|Production vidéo|Packaging|DA Campaign|Stratégie|Modification|Autre>","prio":"<P0|P1|P2|P3>","deadline":"<YYYY-MM-DD ou vide>","livrables":"<ce qui doit être produit>","resume":"<le retour reformulé en 1-2 phrases>"}]}
Règles :
- si le retour concerne un projet du portefeuille ci-dessous, action="revision" et parent=son ndeg EXACT ;
- sinon action="nouveau" (parent vide) ;
- ne fusionne pas des demandes distinctes : une demande = un item ;
- n'invente ni deadline ni priorité : vide si non dit (prio par défaut P2) ;
- tout en français.
Portefeuille actif :
${portefeuille || "(vide)"}`;
  const user = (clientHint ? `Client concerné (indiqué par l'expéditeur) : ${clientHint}\n\n` : "") + `Retour client :\n${text}`;
  return { system, user };
}
async function askOllama(text, clientHint, masters) {
  const { system, user } = buildPrompt(text, clientHint, masters);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(OLLAMA_URL + "/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL, stream: false, format: "json",
        options: { temperature: 0 },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!r.ok) throw new Error("Ollama HTTP " + r.status);
    const data = await r.json();
    const content = data && data.message && data.message.content;
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.items)) throw new Error("réponse sans items[]");
    return parsed.items;
  } finally { clearTimeout(timer); }
}

// ---- validation/normalisation de ce que renvoie le modèle -------------------
const TYPES = new Set(["Création KV", "Production vidéo", "Packaging", "DA Campaign", "Stratégie", "Modification", "Pitch", "Coordination", "Autre"]);
const PRIOS = new Set(["P0", "P1", "P2", "P3"]);
function normalizeItems(items, masters, clientHint) {
  const byNdeg = Object.fromEntries(masters.map(m => [m.ndeg, m]));
  const out = [];
  for (const raw of (items || []).slice(0, 12)) {
    if (!raw || typeof raw !== "object") continue;
    const parent = byNdeg[String(raw.parent || "").trim()] ? String(raw.parent).trim() : "";
    const revision = raw.action === "revision" && !!parent;
    const client = String(raw.client || (revision ? byNdeg[parent].client : "") || clientHint || "").trim();
    const projet = String(raw.projet || "").trim().slice(0, 180);
    if (!projet || !client) continue;
    out.push({
      revision, parent,
      client,
      marque: String(raw.marque || (revision ? byNdeg[parent].marque || "" : "")).trim().slice(0, 80),
      projet,
      type: TYPES.has(raw.type) ? raw.type : (revision ? "Modification" : "Autre"),
      prio: PRIOS.has(raw.prio) ? raw.prio : "P2",
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline || "") ? raw.deadline : "",
      livrables: String(raw.livrables || "").trim().slice(0, 300),
      resume: String(raw.resume || "").trim().slice(0, 500),
    });
  }
  return out;
}

// ---- insertion (statut Reçu, brief déduit → file « À valider ») -------------
async function insertTasks(tasks, rawText, person) {
  const { all } = await loadContext();
  const taken = [];
  const created = [];
  const today = todayISO();
  for (const t of tasks) {
    const ndeg = t.revision ? nextRevisionCode(all, taken, t.parent) : nextProjectCode(all, taken, clientPrefix(all, t.client));
    taken.push(ndeg);
    const comm = "Retour client (ingest" + (person ? " · " + person : "") + ") : " + (t.resume || String(rawText).slice(0, 300));
    const { rows } = await pgQuery(
      `insert into briefs (ndeg, client, marque, projet, niveau, type, statut, prio, deadline,
                           livrables, date_reception, entree, parent, comm, entre_par, brief_etat)
       values ($1,$2,$3,$4,$5,$6,'Reçu',$7,$8,$9,$10,$11,$12,$13,$14,'déduit') returning *`,
      [ndeg, t.client, t.marque, t.projet, t.revision ? "Révision" : "Maître", t.type, t.prio,
       t.deadline, t.livrables, today, t.revision ? "Révision" : "Maître", t.parent, comm, person]);
    const b = rows[0];
    await emitEvent({ query: pgQuery }, {
      ndeg: b.ndeg, entree: b.entree, client: b.client, projet: b.projet,
      kind: "created", statut_new: b.statut, resp_new: person, summary: "Retour client → " + (t.revision ? "révision" : "nouveau projet"),
    });
    created.push({ ndeg: b.ndeg, projet: b.projet, client: b.client, entree: b.entree, parent: b.parent || "", prio: b.prio, deadline: b.deadline || "" });
  }
  return created;
}

// ---- POST /ingest — { text, client? } ----------------------------------------
export async function handleIngest(context) {
  if (!hasDb()) return json({ message: "base non configurée" }, 503);
  await initDb();
  const email = (context.data && context.data.email) || "";
  const person = identityFor(email).person || email;

  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "corps JSON attendu" }, 400); }
  const text = String((payload && payload.text) || "").trim();
  const clientHint = String((payload && payload.client) || "").trim().slice(0, 80);
  if (!text) return json({ message: "text requis" }, 400);
  if (text.length > MAX_TEXT) return json({ message: "texte trop long" }, 413);

  const { masters } = await loadContext();
  let items = null, llmError = "";
  try { items = normalizeItems(await askOllama(text, clientHint, masters), masters, clientHint); }
  catch (e) { llmError = String((e && e.message) || e); }

  if (items && items.length) {
    const created = await insertTasks(items, text, person);
    return json({ ok: true, created, model: OLLAMA_MODEL }, 201);
  }

  // Repli sans perte : le retour entre quand même dans le système, à trier à la main.
  console.warn("[ingest] repli brut —", llmError || "0 item exploitable");
  const created = await insertTasks([{
    revision: false, parent: "", client: clientHint || "À qualifier", marque: "",
    projet: "Retour client à trier — " + todayISO(), type: "Autre", prio: "P2",
    deadline: "", livrables: "", resume: String(text).slice(0, 500),
  }], text, person);
  return json({ ok: true, fallback: true, reason: llmError || "réponse inexploitable", created, model: OLLAMA_MODEL }, 201);
}
